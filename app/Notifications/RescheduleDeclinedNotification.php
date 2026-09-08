<?php

namespace App\Notifications;

use App\Models\MeetingBooking;
use App\Models\MeetingRescheduleRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class RescheduleDeclinedNotification extends Notification
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
            ->subject("Reschedule declined: {$booking->type_name}")
            ->markdown('emails.notifications.reschedule-declined', [
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
            'type' => 'reschedule_declined',
            'booking_id' => $booking->id,
            'reschedule_request_id' => $request->id,
            'meeting_type_name' => $booking->type_name,
            'guest_name' => $booking->guest_name,
            'proposed_start_time' => $request->proposed_start_time->toIso8601String(),
            'title' => 'Reschedule Declined',
            'body' => "The reschedule for your {$booking->type_name} meeting has been declined. The original time remains.",
        ];
    }
}
