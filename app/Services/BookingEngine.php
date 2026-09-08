<?php

namespace App\Services;

use App\Exceptions\InvalidBookingStateException;
use App\Exceptions\SlotUnavailableException;
use App\Models\MeetingBooking;
use App\Models\MeetingRescheduleRequest;
use App\Models\MeetingType;
use App\Notifications\MeetingCancelledNotification;
use App\Notifications\MeetingConfirmedNotification;
use App\Notifications\MeetingDeclinedNotification;
use App\Notifications\MeetingRequestReceivedNotification;
use App\Notifications\RescheduleAcceptedNotification;
use App\Notifications\RescheduleDeclinedNotification;
use App\Notifications\RescheduleProposedNotification;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class BookingEngine
{
    public function __construct(
        protected AvailabilityEngine $availabilityEngine
    ) {}

    /**
     * Create a booking with full transactional double-booking protection.
     *
     * Steps:
     * 1. Begin transaction with row-level lock on meeting type.
     * 2. Recalculate availability (authoritative re-check).
     * 3. Recheck all conflicts.
     * 4. Create booking only if still available.
     * 5. Commit transaction.
     * 6. Dispatch notifications after commit.
     *
     * @throws SlotUnavailableException If the slot was taken by another request.
     */
    public function book(
        MeetingType $type,
        string $guestName,
        string $guestEmail,
        Carbon $slotStart,
        string $timezone,
        ?string $guestPhone = null,
        ?string $guestNotes = null,
        ?array $customAnswers = null,
        ?int $guestUserId = null
    ): MeetingBooking {
        return DB::transaction(function () use (
            $type, $guestName, $guestEmail, $slotStart, $timezone,
            $guestPhone, $guestNotes, $customAnswers, $guestUserId
        ) {
            // Lock the meeting type row to serialize concurrent bookings for this type
            $lockedType = MeetingType::where('id', $type->id)->lockForUpdate()->first();

            if (!$lockedType || !$lockedType->is_active) {
                throw new SlotUnavailableException('This meeting type is no longer available.');
            }

            $duration = $lockedType->duration_minutes;
            $slotEnd = $slotStart->copy()->addMinutes($duration);

            // Authoritative re-check: validate the slot through the availability engine
            $validation = $this->availabilityEngine->validateSlot($lockedType, $slotStart, $slotEnd);

            if (!$validation['available']) {
                throw new SlotUnavailableException(
                    $validation['reason'] ?? 'This time slot is no longer available.'
                );
            }

            // Create the booking inside the transaction
            $snapshot = MeetingBooking::snapshotFromType($lockedType);

            $booking = MeetingBooking::create(array_merge([
                'meeting_type_id' => $lockedType->id,
                'host_user_id' => $lockedType->user_id,
                'guest_user_id' => $guestUserId,
                'status' => MeetingBooking::STATUS_PENDING,
                'guest_name' => $guestName,
                'guest_email' => $guestEmail,
                'guest_phone' => $guestPhone,
                'guest_notes' => $guestNotes,
                'guest_cancellation_token' => Str::random(64),
                'start_time' => $slotStart,
                'end_time' => $slotEnd,
                'timezone' => $timezone,
                'host_timezone' => $lockedType->user->timezone ?? 'UTC',
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

            // Dispatch notifications after transaction commits.
            // Notification failures must NOT roll back the booking.
            DB::afterCommit(function () use ($booking) {
                $host = $booking->host;
                if ($host) {
                    $host->notify(new MeetingRequestReceivedNotification($booking));
                }
            });

            return $booking;
        });
    }

    /**
     * Confirm a pending booking.
     */
    public function confirmBooking(MeetingBooking $booking): MeetingBooking
    {
        if (!$booking->isPending()) {
            throw new InvalidBookingStateException('Only pending bookings can be confirmed.');
        }

        $booking->update([
            'status' => MeetingBooking::STATUS_CONFIRMED,
            'confirmed_at' => Carbon::now('UTC'),
        ]);

        DB::afterCommit(function () use ($booking) {
            $guest = $booking->guestUser;
            if ($guest) {
                $guest->notify(new MeetingConfirmedNotification($booking));
            }

            $host = $booking->host;
            if ($host) {
                $host->notify(new MeetingConfirmedNotification($booking));
            }
        });

        return $booking->fresh();
    }

    /**
     * Decline a booking (host action).
     */
    public function declineBooking(MeetingBooking $booking, ?string $reason = null): MeetingBooking
    {
        if (!$booking->isActive()) {
            throw new InvalidBookingStateException('Only active bookings can be declined.');
        }

        $booking->update([
            'status' => MeetingBooking::STATUS_DECLINED,
            'cancelled_at' => Carbon::now('UTC'),
            'cancelled_by' => 'host',
            'cancellation_reason' => $reason,
        ]);

        DB::afterCommit(function () use ($booking, $reason) {
            $guest = $booking->guestUser;
            if ($guest) {
                $guest->notify(new MeetingDeclinedNotification($booking, $reason));
            }
        });

        return $booking->fresh();
    }

    /**
     * Cancel a booking by the host.
     */
    public function cancelBookingByHost(MeetingBooking $booking, ?string $reason = null): MeetingBooking
    {
        if (!$booking->isActive()) {
            throw new InvalidBookingStateException('Only active bookings can be cancelled.');
        }

        $booking->update([
            'status' => MeetingBooking::STATUS_CANCELLED,
            'cancelled_at' => Carbon::now('UTC'),
            'cancelled_by' => 'host',
            'cancellation_reason' => $reason,
        ]);

        DB::afterCommit(function () use ($booking, $reason) {
            $guest = $booking->guestUser;
            if ($guest) {
                $guest->notify(new MeetingCancelledNotification($booking, $reason));
            }
        });

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

        DB::afterCommit(function () use ($booking, $reason) {
            $host = $booking->host;
            if ($host) {
                $host->notify(new MeetingCancelledNotification($booking, $reason));
            }
        });

        return $booking->fresh();
    }

    /**
     * Propose a reschedule with availability re-check.
     */
    public function proposeReschedule(
        MeetingBooking $booking,
        int $requestedByUserId,
        Carbon $proposedStart,
        ?string $reason = null
    ): MeetingRescheduleRequest {
        if (!$booking->isActive()) {
            throw new InvalidBookingStateException('Only active bookings can be rescheduled.');
        }

        $type = $booking->meetingType;
        $proposedEnd = $proposedStart->copy()->addMinutes($type->duration_minutes);

        // Validate the proposed slot
        $validation = $this->availabilityEngine->validateSlot($type, $proposedStart, $proposedEnd);
        if (!$validation['available']) {
            throw new SlotUnavailableException(
                $validation['reason'] ?? 'The proposed time slot is not available.'
            );
        }

        $request = $booking->rescheduleRequests()->create([
            'requested_by_user_id' => $requestedByUserId,
            'proposed_start_time' => $proposedStart,
            'proposed_end_time' => $proposedEnd,
            'status' => MeetingRescheduleRequest::STATUS_PENDING,
            'reason' => $reason,
        ]);

        $booking->update([
            'status' => MeetingBooking::STATUS_RESCHEDULE_REQUESTED,
        ]);

        DB::afterCommit(function () use ($booking, $request) {
            // Notify the other party (not the one who proposed)
            $proposerId = $request->requested_by_user_id;

            if ($booking->host_user_id !== $proposerId && $booking->host) {
                $booking->host->notify(new RescheduleProposedNotification($booking, $request));
            }

            $guest = $booking->guestUser;
            if ($guest && $guest->id !== $proposerId) {
                $guest->notify(new RescheduleProposedNotification($booking, $request));
            }
        });

        return $request;
    }

    /**
     * Accept a reschedule proposal.
     */
    public function acceptReschedule(MeetingRescheduleRequest $request): MeetingBooking
    {
        if (!$request->isPending()) {
            throw new InvalidBookingStateException('This reschedule request is no longer pending.');
        }

        $booking = $request->booking;

        $request->update([
            'status' => MeetingRescheduleRequest::STATUS_ACCEPTED,
            'responded_at' => Carbon::now('UTC'),
        ]);

        $booking->update([
            'start_time' => $request->proposed_start_time,
            'end_time' => $request->proposed_end_time,
            'status' => MeetingBooking::STATUS_CONFIRMED,
            'confirmed_at' => Carbon::now('UTC'),
        ]);

        // Expire other pending reschedule requests for this booking
        $booking->rescheduleRequests()
            ->where('id', '!=', $request->id)
            ->where('status', MeetingRescheduleRequest::STATUS_PENDING)
            ->update(['status' => MeetingRescheduleRequest::STATUS_EXPIRED]);

        DB::afterCommit(function () use ($booking, $request) {
            $guest = $booking->guestUser;
            if ($guest) {
                $guest->notify(new RescheduleAcceptedNotification($booking, $request));
            }

            $host = $booking->host;
            if ($host) {
                $host->notify(new RescheduleAcceptedNotification($booking, $request));
            }
        });

        return $booking->fresh();
    }

    /**
     * Decline a reschedule proposal.
     */
    public function declineReschedule(MeetingRescheduleRequest $request): MeetingRescheduleRequest
    {
        if (!$request->isPending()) {
            throw new InvalidBookingStateException('This reschedule request is no longer pending.');
        }

        $request->update([
            'status' => MeetingRescheduleRequest::STATUS_DECLINED,
            'responded_at' => Carbon::now('UTC'),
        ]);

        $booking = $request->booking;
        if ($booking->status === MeetingBooking::STATUS_RESCHEDULE_REQUESTED) {
            $booking->update(['status' => MeetingBooking::STATUS_CONFIRMED]);
        }

        DB::afterCommit(function () use ($booking, $request) {
            $proposerId = $request->requested_by_user_id;

            if ($booking->host_user_id !== $proposerId && $booking->host) {
                $booking->host->notify(new RescheduleDeclinedNotification($booking, $request));
            }

            $guest = $booking->guestUser;
            if ($guest && $guest->id !== $proposerId) {
                $guest->notify(new RescheduleDeclinedNotification($booking, $request));
            }
        });

        return $request->fresh();
    }

    /**
     * Expire all pending bookings whose start time has passed.
     * Run as a scheduled job.
     */
    public function expirePendingBookings(): int
    {
        return MeetingBooking::where('status', MeetingBooking::STATUS_PENDING)
            ->where('start_time', '<', Carbon::now('UTC'))
            ->update(['status' => MeetingBooking::STATUS_EXPIRED]);
    }

    /**
     * Expire all pending reschedule requests whose proposed time has passed.
     * Run as a scheduled job.
     */
    public function expirePendingRescheduleRequests(): int
    {
        return MeetingRescheduleRequest::where('status', MeetingRescheduleRequest::STATUS_PENDING)
            ->where('proposed_start_time', '<', Carbon::now('UTC'))
            ->update(['status' => MeetingRescheduleRequest::STATUS_EXPIRED]);
    }
}
