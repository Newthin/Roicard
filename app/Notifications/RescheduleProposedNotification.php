<?php

namespace App\Notifications;

use App\Models\MeetingBooking;
use App\Models\MeetingRescheduleRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class RescheduleProposedNotification extends Notification
{
    use Queueable;

    public function __construct(
        public MeetingBooking $booking,
        public MeetingRescheduleRequest $rescheduleRequest
    ) {}

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $booking = $this->booking;
        $request = $this->rescheduleRequest;

        return (new MailMessage)
            ->subject("Reschedule proposed: {$booking->type_name}")
            ->markdown('emails.notifications.reschedule-proposed', [
                'booking' => $booking,
                'rescheduleRequest' => $request,
                'recipient' => $notifiable,
            ]);
    }

    public function toArray(object $notifiable): array
    {
        $booking = $this->booking;
        $request = $this->rescheduleRequest;

        return [
            'type' => 'reschedule_proposed',
            'booking_id' => $booking->id,
            'reschedule_request_id' => $request->id,
            'meeting_type_name' => $booking->type_name,
            'guest_name' => $booking->guest_name,
            'original_start_time' => $booking->start_time->toIso8601String(),
            'proposed_start_time' => $request->proposed_start_time->toIso8601String(),
            'proposed_end_time' => $request->proposed_end_time->toIso8601String(),
            'reason' => $request->reason,
            'title' => 'Reschedule Proposed',
            'body' => "A reschedule has been proposed for your {$booking->type_name} meeting.",
        ];
    }
}
