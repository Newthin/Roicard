<?php

namespace App\Services;

use App\Mail\GuestMeetingMail;
use App\Models\MeetingBooking;
use App\Models\MeetingRescheduleRequest;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Sends email notifications to non-registered guests.
 *
 * Registered guests (guest_user_id set) receive notifications via
 * the existing $guest->notify() pattern in BookingEngine.
 * This service handles the case where the guest has no Roicard account.
 */
class GuestNotificationService
{
    /**
     * Notify guest that their booking request was received.
     */
    public function sendBookingReceived(MeetingBooking $booking): void
    {
        if (!$this->shouldSend($booking)) {
            return;
        }

        $this->sendMail($booking, 'guest-booking-received', [
            'guestName' => $booking->guest_name,
            'booking' => $booking,
        ]);
    }

    /**
     * Notify guest that their booking was confirmed.
     */
    public function sendBookingConfirmed(MeetingBooking $booking): void
    {
        if (!$this->shouldSend($booking)) {
            return;
        }

        $this->sendMail($booking, 'guest-meeting-confirmed', [
            'guestName' => $booking->guest_name,
            'booking' => $booking,
        ], withAttachment: true);
    }

    /**
     * Notify guest that their booking was declined.
     */
    public function sendBookingDeclined(MeetingBooking $booking, ?string $reason = null): void
    {
        if (!$this->shouldSend($booking)) {
            return;
        }

        $this->sendMail($booking, 'guest-meeting-declined', [
            'guestName' => $booking->guest_name,
            'booking' => $booking,
            'reason' => $reason,
        ]);
    }

    /**
     * Notify guest that the meeting was cancelled.
     */
    public function sendBookingCancelled(MeetingBooking $booking, ?string $reason = null): void
    {
        if (!$this->shouldSend($booking)) {
            return;
        }

        $this->sendMail($booking, 'guest-meeting-cancelled', [
            'guestName' => $booking->guest_name,
            'booking' => $booking,
            'reason' => $reason,
        ]);
    }

    /**
     * Notify guest that a reschedule has been proposed.
     */
    public function sendRescheduleProposed(MeetingBooking $booking, MeetingRescheduleRequest $request): void
    {
        if (!$this->shouldSend($booking)) {
            return;
        }

        $this->sendMail($booking, 'guest-reschedule-proposed', [
            'guestName' => $booking->guest_name,
            'booking' => $booking,
            'rescheduleRequest' => $request,
        ]);
    }

    /**
     * Notify guest that a reschedule was accepted.
     */
    public function sendRescheduleAccepted(MeetingBooking $booking, MeetingRescheduleRequest $request): void
    {
        if (!$this->shouldSend($booking)) {
            return;
        }

        $this->sendMail($booking, 'guest-reschedule-accepted', [
            'guestName' => $booking->guest_name,
            'booking' => $booking,
            'rescheduleRequest' => $request,
        ], withAttachment: true);
    }

    /**
     * Notify guest that a reschedule was declined.
     */
    public function sendRescheduleDeclined(MeetingBooking $booking, MeetingRescheduleRequest $request): void
    {
        if (!$this->shouldSend($booking)) {
            return;
        }

        $this->sendMail($booking, 'guest-reschedule-declined', [
            'guestName' => $booking->guest_name,
            'booking' => $booking,
            'rescheduleRequest' => $request,
        ]);
    }

    /**
     * Send a meeting reminder to the guest.
     */
    public function sendReminder(MeetingBooking $booking, string $reminderType): void
    {
        if (!$this->shouldSend($booking)) {
            return;
        }

        $label = $reminderType === '24h' ? 'tomorrow' : 'in 1 hour';
        $subject = "Reminder: {$booking->type_name} {$label}";

        $this->sendMail($booking, 'guest-meeting-reminder', [
            'guestName' => $booking->guest_name,
            'booking' => $booking,
            'reminderType' => $reminderType,
        ], $subject);
    }

    /**
     * Determine if we should send a notification to this guest.
     *
     * Only sends if:
     * - guest_email is present
     * - guest_user_id is NOT set (registered guests get notifications via User->notify())
     */
    protected function shouldSend(MeetingBooking $booking): bool
    {
        return !empty($booking->guest_email) && empty($booking->guest_user_id);
    }

    /**
     * Send an email via Mailable.
     */
    protected function sendMail(
        MeetingBooking $booking,
        string $template,
        array $data,
        ?string $subject = null,
        bool $withAttachment = false
    ): void {
        try {
            $subject = $subject ?? $this->buildSubject($booking, $template);
            $data['subject'] = $subject;

            $mailable = new GuestMeetingMail($template, $data);

            if ($withAttachment) {
                $icsService = app(IcsService::class);
                $icsContent = $icsService->generateContent($booking);
                $icsFilename = $icsService->generateFilename($booking);

                $mailable->attachData($icsContent, $icsFilename, [
                    'mime' => 'text/calendar; charset=utf-8',
                ]);
            }

            Mail::to($booking->guest_email)->send($mailable);
        } catch (\Throwable $e) {
            Log::error('Failed to send guest notification', [
                'email' => $booking->guest_email,
                'template' => $template,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Build subject line from template name.
     */
    protected function buildSubject(MeetingBooking $booking, string $template): string
    {
        return match ($template) {
            'guest-booking-received' => "Booking request received: {$booking->type_name}",
            'guest-meeting-confirmed' => "Meeting confirmed: {$booking->type_name}",
            'guest-meeting-declined' => "Meeting declined: {$booking->type_name}",
            'guest-meeting-cancelled' => "Meeting cancelled: {$booking->type_name}",
            'guest-reschedule-proposed' => "Reschedule proposed: {$booking->type_name}",
            'guest-reschedule-accepted' => "Reschedule accepted: {$booking->type_name}",
            'guest-reschedule-declined' => "Reschedule declined: {$booking->type_name}",
            'guest-meeting-reminder' => "Reminder: {$booking->type_name}",
            default => "Meeting Notification: {$booking->type_name}",
        };
    }
}
