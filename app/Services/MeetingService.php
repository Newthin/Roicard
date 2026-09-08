<?php

namespace App\Services;

use App\Models\MeetingBlockedDate;
use App\Models\MeetingBooking;
use App\Models\MeetingType;
use App\Models\MeetingTypeAvailability;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class MeetingService
{
    /**
     * Generate available time slots for a meeting type within a date range.
     *
     * Slots are computed from the meeting type's weekly availability rules,
     * the host's timezone, blocked dates, and existing bookings. All times
     * in the returned collection are UTC.
     *
     * @param MeetingType $type
     * @param CarbonInterface $rangeStart Start of the search window (UTC)
     * @param CarbonInterface $rangeEnd End of the search window (UTC)
     * @param int $slotCount Maximum slots to return (default 50)
     * @return Collection<int, array{start: Carbon, end: Carbon}>
     */
    public function getAvailableSlots(
        MeetingType $type,
        CarbonInterface $rangeStart,
        CarbonInterface $rangeEnd,
        int $slotCount = 50
    ): Collection {
        $host = $type->user;
        $tz = $host->timezone ?? 'UTC';

        $availability = $type->availability;
        if ($availability->isEmpty()) {
            return collect();
        }

        $blockedDates = $host->blockedDates()->get();

        $slots = collect();
        $current = $rangeStart->copy()->startOfDay();
        $end = $rangeEnd->copy()->endOfDay();

        while ($current->lte($end) && $slots->count() < $slotCount) {
            $dayOfWeek = (int) $current->format('w');

            $dayRules = $availability->where('day_of_week', $dayOfWeek);

            if ($dayRules->isNotEmpty() && !$this->isDateBlocked($current, $blockedDates)) {
                foreach ($dayRules as $rule) {
                    $ruleStart = Carbon::parse($rule->start_time, $tz)->setDate(
                        $current->year, $current->month, $current->day
                    );
                    $ruleEnd = Carbon::parse($rule->end_time, $tz)->setDate(
                        $current->year, $current->month, $current->day
                    );

                    if ($ruleEnd->lte($ruleStart)) {
                        $ruleEnd->addDay();
                    }

                    $slotStart = $ruleStart->copy();
                    $duration = $type->duration_minutes;
                    $buffer = $type->buffer_minutes;

                    while ($slotStart->copy()->addMinutes($duration)->lte($ruleEnd)
                        && $slots->count() < $slotCount) {
                        $slotEnd = $slotStart->copy()->addMinutes($duration);
                        $slotEndUtc = $slotEnd->copy()->setTimezone('UTC');
                        $slotStartUtc = $slotStart->copy()->setTimezone('UTC');

                        // Skip past slots
                        if ($slotStartUtc->gt(Carbon::now('UTC'))) {
                            // Check minimum notice (2 hours)
                            $minNotice = Carbon::now('UTC')->addHours(2);
                            if ($slotStartUtc->gte($minNotice)) {
                                // Check for overlapping active bookings
                                if (!$this->hasOverlappingBooking($type, $slotStartUtc, $slotEndUtc)) {
                                    $slots->push([
                                        'start' => $slotStartUtc->copy(),
                                        'end' => $slotEndUtc->copy(),
                                    ]);
                                }
                            }
                        }

                        $slotStart->addMinutes($duration + $buffer);
                    }
                }
            }

            $current->addDay();
        }

        return $slots->take($slotCount);
    }

    /**
     * Check if a date falls within any blocked date range.
     */
    protected function isDateBlocked(Carbon $date, Collection $blockedDates): bool
    {
        return $blockedDates->contains(fn (MeetingBlockedDate $blocked) => $blocked->coversDate($date));
    }

    /**
     * Check if a time range overlaps with existing active bookings.
     */
    protected function hasOverlappingBooking(MeetingType $type, Carbon $start, Carbon $end, ?int $excludeBookingId = null): bool
    {
        return $type->activeBookingsDuring($start, $end, $excludeBookingId)->exists();
    }

    /**
     * Create a new booking from a validated request.
     */
    public function createBooking(
        MeetingType $type,
        string $guestName,
        string $guestEmail,
        string $startTime,
        string $timezone,
        ?string $guestPhone = null,
        ?string $guestNotes = null,
        ?array $customAnswers = null
    ): MeetingBooking {
        $start = Carbon::parse($startTime, 'UTC');
        $end = $start->copy()->addMinutes($type->duration_minutes);

        // Verify the slot is still available
        if ($this->hasOverlappingBooking($type, $start, $end)) {
            throw new \App\Exceptions\SlotUnavailableException('This time slot is no longer available.');
        }

        $snapshot = MeetingBooking::snapshotFromType($type);

        $booking = MeetingBooking::create(array_merge([
            'meeting_type_id' => $type->id,
            'host_user_id' => $type->user_id,
            'status' => MeetingBooking::STATUS_PENDING,
            'guest_name' => $guestName,
            'guest_email' => $guestEmail,
            'guest_phone' => $guestPhone,
            'guest_notes' => $guestNotes,
            'guest_cancellation_token' => Str::random(64),
            'start_time' => $start,
            'end_time' => $end,
            'timezone' => $timezone,
            'host_timezone' => $type->user->timezone ?? 'UTC',
        ], $snapshot));

        if (!empty($customAnswers)) {
            foreach ($customAnswers as $index => $answer) {
                $booking->customAnswers()->create([
                    'question' => $answer['question'],
                    'answer' => $answer['answer'],
                    'sort_order' => $index,
                ]);
            }
        }

        return $booking;
    }

    /**
     * Confirm a pending booking.
     */
    public function confirmBooking(MeetingBooking $booking): MeetingBooking
    {
        if (!$booking->isPending()) {
            throw new \App\Exceptions\InvalidBookingStateException(
                'Only pending bookings can be confirmed.'
            );
        }

        $booking->update([
            'status' => MeetingBooking::STATUS_CONFIRMED,
            'confirmed_at' => Carbon::now('UTC'),
        ]);

        return $booking->fresh();
    }

    /**
     * Decline a pending booking.
     */
    public function declineBooking(MeetingBooking $booking, ?string $reason = null): MeetingBooking
    {
        if (!$booking->isActive()) {
            throw new \App\Exceptions\InvalidBookingStateException(
                'Only active bookings can be declined.'
            );
        }

        $booking->update([
            'status' => MeetingBooking::STATUS_DECLINED,
            'cancelled_at' => Carbon::now('UTC'),
            'cancelled_by' => 'host',
            'cancellation_reason' => $reason,
        ]);

        return $booking->fresh();
    }

    /**
     * Cancel a booking by the host.
     */
    public function cancelBookingByHost(MeetingBooking $booking, ?string $reason = null): MeetingBooking
    {
        if (!$booking->isActive()) {
            throw new \App\Exceptions\InvalidBookingStateException(
                'Only active bookings can be cancelled.'
            );
        }

        $booking->update([
            'status' => MeetingBooking::STATUS_CANCELLED,
            'cancelled_at' => Carbon::now('UTC'),
            'cancelled_by' => 'host',
            'cancellation_reason' => $reason,
        ]);

        return $booking->fresh();
    }

    /**
     * Cancel a booking by the guest using their cancellation token.
     */
    public function cancelBookingByGuest(string $token, ?string $reason = null): MeetingBooking
    {
        $booking = MeetingBooking::where('guest_cancellation_token', $token)
            ->whereIn('status', [MeetingBooking::STATUS_PENDING, MeetingBooking::STATUS_CONFIRMED])
            ->firstOrFail();

        $booking->update([
            'status' => MeetingBooking::STATUS_CANCELLED,
            'cancelled_at' => Carbon::now('UTC'),
            'cancelled_by' => 'guest',
            'cancellation_reason' => $reason,
        ]);

        return $booking->fresh();
    }

    /**
     * Propose a reschedule for a booking.
     */
    public function proposeReschedule(
        MeetingBooking $booking,
        int $requestedByUserId,
        string $proposedStartTime,
        ?string $reason = null
    ): \App\Models\MeetingRescheduleRequest {
        if (!$booking->isActive()) {
            throw new \App\Exceptions\InvalidBookingStateException(
                'Only active bookings can be rescheduled.'
            );
        }

        $proposedStart = Carbon::parse($proposedStartTime, 'UTC');
        $proposedEnd = $proposedStart->copy()->addMinutes($booking->meetingType->duration_minutes);

        // Check the new slot doesn't overlap existing bookings
        $overlaps = MeetingBooking::where('meeting_type_id', $booking->meeting_type_id)
            ->where('id', '!=', $booking->id)
            ->whereIn('status', [MeetingBooking::STATUS_PENDING, MeetingBooking::STATUS_CONFIRMED])
            ->where('start_time', '<', $proposedEnd)
            ->where('end_time', '>', $proposedStart)
            ->exists();

        if ($overlaps) {
            throw new \App\Exceptions\SlotUnavailableException(
                'The proposed time slot conflicts with an existing booking.'
            );
        }

        $request = $booking->rescheduleRequests()->create([
            'requested_by_user_id' => $requestedByUserId,
            'proposed_start_time' => $proposedStart,
            'proposed_end_time' => $proposedEnd,
            'status' => \App\Models\MeetingRescheduleRequest::STATUS_PENDING,
            'reason' => $reason,
        ]);

        $booking->update([
            'status' => MeetingBooking::STATUS_RESCHEDULE_REQUESTED,
        ]);

        return $request;
    }

    /**
     * Accept a reschedule proposal.
     */
    public function acceptReschedule(\App\Models\MeetingRescheduleRequest $request): MeetingBooking
    {
        if (!$request->isPending()) {
            throw new \App\Exceptions\InvalidBookingStateException(
                'This reschedule request is no longer pending.'
            );
        }

        $booking = $request->booking;

        $request->update([
            'status' => \App\Models\MeetingRescheduleRequest::STATUS_ACCEPTED,
            'responded_at' => Carbon::now('UTC'),
        ]);

        $booking->update([
            'start_time' => $request->proposed_start_time,
            'end_time' => $request->proposed_end_time,
            'status' => MeetingBooking::STATUS_CONFIRMED,
            'confirmed_at' => Carbon::now('UTC'),
        ]);

        // Expire any other pending reschedule requests for this booking
        $booking->rescheduleRequests()
            ->where('id', '!=', $request->id)
            ->where('status', \App\Models\MeetingRescheduleRequest::STATUS_PENDING)
            ->update(['status' => \App\Models\MeetingRescheduleRequest::STATUS_EXPIRED]);

        return $booking->fresh();
    }

    /**
     * Decline a reschedule proposal.
     */
    public function declineReschedule(\App\Models\MeetingRescheduleRequest $request): \App\Models\MeetingRescheduleRequest
    {
        if (!$request->isPending()) {
            throw new \App\Exceptions\InvalidBookingStateException(
                'This reschedule request is no longer pending.'
            );
        }

        $request->update([
            'status' => \App\Models\MeetingRescheduleRequest::STATUS_DECLINED,
            'responded_at' => Carbon::now('UTC'),
        ]);

        $booking = $request->booking;
        if ($booking->status === MeetingBooking::STATUS_RESCHEDULE_REQUESTED) {
            $booking->update(['status' => MeetingBooking::STATUS_CONFIRMED]);
        }

        return $request->fresh();
    }

    /**
     * Expire all pending bookings whose start time has passed.
     */
    public function expirePendingBookings(): int
    {
        return MeetingBooking::where('status', MeetingBooking::STATUS_PENDING)
            ->where('start_time', '<', Carbon::now('UTC'))
            ->update(['status' => MeetingBooking::STATUS_EXPIRED]);
    }

    /**
     * Expire all pending reschedule requests whose proposed time has passed.
     */
    public function expirePendingRescheduleRequests(): int
    {
        return \App\Models\MeetingRescheduleRequest::where('status', \App\Models\MeetingRescheduleRequest::STATUS_PENDING)
            ->where('proposed_start_time', '<', Carbon::now('UTC'))
            ->update(['status' => \App\Models\MeetingRescheduleRequest::STATUS_EXPIRED]);
    }
}
