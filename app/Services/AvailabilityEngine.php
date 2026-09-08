<?php

namespace App\Services;

use App\Models\MeetingBlockedDate;
use App\Models\MeetingBooking;
use App\Models\MeetingRescheduleRequest;
use App\Models\MeetingType;
use App\Models\MeetingTypeAvailability;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

class AvailabilityEngine
{
    /**
     * Statuses that consume a slot and block availability.
     * PENDING is included: a pending request reserves its exact slot.
     * EXPIRED is excluded: expired requests do NOT block availability.
     */
    private const RESERVING_STATUSES = [
        MeetingBooking::STATUS_PENDING,
        MeetingBooking::STATUS_CONFIRMED,
        MeetingBooking::STATUS_RESCHEDULE_REQUESTED,
    ];

    /**
     * Compute all bookable time slots for a meeting type within a date range.
     *
     * Every slot returned in UTC. The engine applies every scheduling
     * constraint defined on the meeting type and host.
     *
     * @return Collection<int, array{start: Carbon, end: Carbon}>
     */
    public function getAvailableSlots(
        MeetingType $type,
        CarbonInterface $rangeStart,
        CarbonInterface $rangeEnd,
        int $maxSlots = 50
    ): Collection {
        $host = $type->user;
        $hostTz = $host->timezone ?? 'UTC';

        // Load eager data once
        $availability = $type->availability;
        if ($availability->isEmpty()) {
            return collect();
        }

        $blockedDates = $host->blockedDates()->get();
        $allBookings = $this->loadReservingBookings($type);
        $rescheduleReservations = $this->loadRescheduleReservations($type);

        // Compute global constraints
        $now = Carbon::now('UTC');
        $minNotice = $now->copy()->addHours($type->min_notice_hours);
        $advanceDeadline = $now->copy()->addDays($type->advance_booking_days);

        // Clamp range to [now + min_notice, advance_deadline]
        $effectiveStart = $rangeStart->copy()->gt($minNotice) ? $rangeStart : $minNotice;
        $effectiveEnd = $rangeEnd->copy()->lt($advanceDeadline) ? $rangeEnd : $advanceDeadline;

        if ($effectiveStart->gt($effectiveEnd)) {
            return collect();
        }

        $slots = collect();
        $date = $effectiveStart->copy()->startOfDay();
        $endDate = $effectiveEnd->copy()->endOfDay();

        while ($date->lte($endDate) && $slots->count() < $maxSlots) {
            $dayOfWeek = (int) $date->format('w');
            $dayDate = $date->toDateString();

            // Constraint 12-13: Blocked dates / blocked ranges
            if ($this->isDateBlocked($date, $blockedDates)) {
                $date->addDay();
                continue;
            }

            // Constraint 14: Meeting type must be active
            if (!$type->is_active) {
                $date->addDay();
                continue;
            }

            // Constraint 1: Weekly recurring availability
            $dayRules = $availability->where('day_of_week', $dayOfWeek);

            if ($dayRules->isEmpty()) {
                $date->addDay();
                continue;
            }

            // Constraint 9: Max bookings per day (count all reserving statuses for this day)
            $dayBookingsCount = $this->countReservationsOnDay($allBookings, $rescheduleReservations, $dayDate);
            $maxPerDay = $type->max_bookings_per_day;

            // Constraint 15: Capacity
            $capacity = $type->capacity;
            $effectiveDailyCap = $maxPerDay !== null
                ? min($maxPerDay, $capacity)
                : $capacity;

            // Constraint 2: Multiple availability periods per day
            foreach ($dayRules as $rule) {
                $periodStart = Carbon::parse($rule->start_time, $hostTz)->setDate(
                    $date->year, $date->month, $date->day
                );
                $periodEnd = Carbon::parse($rule->end_time, $hostTz)->setDate(
                    $date->year, $date->month, $date->day
                );

                // Overnight window
                if ($periodEnd->lte($periodStart)) {
                    $periodEnd->addDay();
                }

                // Constraint 4-5: Generate slots with duration + buffer
                $duration = $type->duration_minutes;
                $buffer = $type->buffer_minutes;
                $step = $duration + $buffer;

                $cursor = $periodStart->copy();

                while ($cursor->copy()->addMinutes($duration)->lte($periodEnd)) {
                    $slotStart = $cursor->copy();
                    $slotEnd = $cursor->copy()->addMinutes($duration);

                    $slotStartUtc = $slotStart->copy()->setTimezone('UTC');
                    $slotEndUtc = $slotEnd->copy()->setTimezone('UTC');

                    // Constraint 10: Minimum notice
                    if ($slotStartUtc->lt($minNotice)) {
                        $cursor->addMinutes($step);
                        continue;
                    }

                    // Constraint 11: Advance booking window
                    if ($slotStartUtc->gt($advanceDeadline)) {
                        break;
                    }

                    // Constraint 16: Current time — skip past slots
                    if ($slotStartUtc->lte($now)) {
                        $cursor->addMinutes($step);
                        continue;
                    }

                    // Constraint 6-8: Existing bookings, pending requests, reschedule reservations
                    if ($this->hasConflict($allBookings, $rescheduleReservations, $slotStartUtc, $slotEndUtc)) {
                        $cursor->addMinutes($step);
                        continue;
                    }

                    // Constraint 9: Max bookings per day
                    if ($effectiveDailyCap !== null && $dayBookingsCount >= $effectiveDailyCap) {
                        break;
                    }

                    // Constraint 15: Per-slot capacity check via overlap count
                    $overlapCount = $this->countOverlappingReservations(
                        $allBookings, $rescheduleReservations, $slotStartUtc, $slotEndUtc
                    );
                    if ($overlapCount >= $capacity) {
                        $cursor->addMinutes($step);
                        continue;
                    }

                    $slots->push([
                        'start' => $slotStartUtc->copy(),
                        'end' => $slotEndUtc->copy(),
                    ]);

                    $dayBookingsCount++;
                    $cursor->addMinutes($step);
                }
            }

            $date->addDay();
        }

        return $slots->take($maxSlots);
    }

    /**
     * Validate that a specific slot is currently bookable.
     * Used by BookingEngine for authoritative re-check at booking time.
     *
     * @return array{available: bool, reason: ?string}
     */
    public function validateSlot(MeetingType $type, Carbon $slotStart, Carbon $slotEnd): array
    {
        $host = $type->user;
        $hostTz = $host->timezone ?? 'UTC';
        $now = Carbon::now('UTC');

        // Constraint 14: Meeting type must be active
        if (!$type->is_active) {
            return ['available' => false, 'reason' => 'Meeting type is not active.'];
        }

        // Constraint 10: Minimum notice
        $minNotice = $now->copy()->addHours($type->min_notice_hours);
        if ($slotStart->lt($minNotice)) {
            return ['available' => false, 'reason' => 'Slot is before minimum notice window.'];
        }

        // Constraint 11: Advance booking
        $advanceDeadline = $now->copy()->addDays($type->advance_booking_days);
        if ($slotStart->gt($advanceDeadline)) {
            return ['available' => false, 'reason' => 'Slot is beyond advance booking window.'];
        }

        // Constraint 16: Current time
        if ($slotStart->lte($now)) {
            return ['available' => false, 'reason' => 'Slot is in the past.'];
        }

        // Constraint 12-13: Blocked dates
        $blockedDates = $host->blockedDates()->get();
        if ($this->isDateBlocked($slotStart, $blockedDates)) {
            return ['available' => false, 'reason' => 'Date is blocked.'];
        }

        // Constraint 1: Weekly recurring availability
        $dayOfWeek = (int) $slotStart->timezone($hostTz)->format('w');
        $availability = $type->availability;
        $slotStartLocal = $slotStart->copy()->timezone($hostTz);
        $slotEndLocal = $slotEnd->copy()->timezone($hostTz);

        $coversSlot = $availability->contains(function (MeetingTypeAvailability $rule) use ($dayOfWeek, $slotStartLocal, $slotEndLocal) {
            if ((int) $rule->day_of_week !== $dayOfWeek) {
                return false;
            }
            $periodStart = Carbon::parse($rule->start_time, $rule->meetingType->user->timezone ?? 'UTC')
                ->setDate($slotStartLocal->year, $slotStartLocal->month, $slotStartLocal->day);
            $periodEnd = Carbon::parse($rule->end_time, $rule->meetingType->user->timezone ?? 'UTC')
                ->setDate($slotStartLocal->year, $slotStartLocal->month, $slotStartLocal->day);

            if ($periodEnd->lte($periodStart)) {
                $periodEnd->addDay();
            }

            return $slotStartLocal->gte($periodStart) && $slotEndLocal->lte($periodEnd);
        });

        if (!$coversSlot) {
            return ['available' => false, 'reason' => 'Slot is outside availability hours.'];
        }

        // Constraints 6-8, 15: Conflict check
        $allBookings = $this->loadReservingBookings($type);
        $rescheduleReservations = $this->loadRescheduleReservations($type);

        if ($this->hasConflict($allBookings, $rescheduleReservations, $slotStart, $slotEnd)) {
            return ['available' => false, 'reason' => 'Slot conflicts with an existing reservation.'];
        }

        // Constraint 15: Capacity
        $overlapCount = $this->countOverlappingReservations(
            $allBookings, $rescheduleReservations, $slotStart, $slotEnd
        );
        if ($overlapCount >= $type->capacity) {
            return ['available' => false, 'reason' => 'Slot has reached capacity.'];
        }

        // Constraint 9: Max bookings per day
        $maxPerDay = $type->max_bookings_per_day;
        if ($maxPerDay !== null) {
            $dayDate = $slotStart->toDateString();
            $dayCount = $this->countReservationsOnDay($allBookings, $rescheduleReservations, $dayDate);
            if ($dayCount >= $maxPerDay) {
                return ['available' => false, 'reason' => 'Maximum bookings per day reached.'];
            }
        }

        return ['available' => true, 'reason' => null];
    }

    /**
     * Load all bookings that reserve a time slot.
     * EXPIRED bookings are excluded — they do NOT block availability.
     */
    private function loadReservingBookings(MeetingType $type): Collection
    {
        return $type->bookings()
            ->whereIn('status', self::RESERVING_STATUSES)
            ->where('end_time', '>', Carbon::now('UTC')->subDay())
            ->get();
    }

    /**
     * Load active (pending) reschedule requests that reserve proposed slots.
     */
    private function loadRescheduleReservations(MeetingType $type): Collection
    {
        return MeetingRescheduleRequest::whereHas('booking', function ($q) use ($type) {
            $q->where('meeting_type_id', $type->id);
        })
            ->where('status', MeetingRescheduleRequest::STATUS_PENDING)
            ->where('proposed_end_time', '>', Carbon::now('UTC')->subDay())
            ->get();
    }

    /**
     * Check if a date is blocked by any MeetingBlockedDate record.
     */
    private function isDateBlocked(Carbon $date, Collection $blockedDates): bool
    {
        return $blockedDates->contains(
            fn (MeetingBlockedDate $blocked) => $blocked->coversDate($date)
        );
    }

    /**
     * Check whether a time slot conflicts with any reserving booking or reschedule reservation.
     */
    private function hasConflict(Collection $bookings, Collection $rescheduleReservations, Carbon $start, Carbon $end): bool
    {
        // Check bookings
        $conflictsBooking = $bookings->contains(
            fn (MeetingBooking $b) => $b->start_time->lt($end) && $b->end_time->gt($start)
        );

        if ($conflictsBooking) {
            return true;
        }

        // Check reschedule reservations
        return $rescheduleReservations->contains(
            fn (MeetingRescheduleRequest $r) => $r->proposed_start_time->lt($end) && $r->proposed_end_time->gt($start)
        );
    }

    /**
     * Count how many reserving records overlap a given slot.
     * Used for capacity checks.
     */
    private function countOverlappingReservations(Collection $bookings, Collection $rescheduleReservations, Carbon $start, Carbon $end): int
    {
        $bookingOverlaps = $bookings->filter(
            fn (MeetingBooking $b) => $b->start_time->lt($end) && $b->end_time->gt($start)
        )->count();

        $rescheduleOverlaps = $rescheduleReservations->filter(
            fn (MeetingRescheduleRequest $r) => $r->proposed_start_time->lt($end) && $r->proposed_end_time->gt($start)
        )->count();

        return $bookingOverlaps + $rescheduleOverlaps;
    }

    /**
     * Count all reserving records on a given calendar day (in UTC).
     * A booking "on a day" means its start_time falls on that UTC date.
     */
    private function countReservationsOnDay(Collection $bookings, Collection $rescheduleReservations, string $date): int
    {
        $bookingCount = $bookings->filter(
            fn (MeetingBooking $b) => $b->start_time->toDateString() === $date
        )->count();

        $rescheduleCount = $rescheduleReservations->filter(
            fn (MeetingRescheduleRequest $r) => $r->proposed_start_time->toDateString() === $date
        )->count();

        return $bookingCount + $rescheduleCount;
    }
}
