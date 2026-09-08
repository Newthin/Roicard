<?php

namespace App\Notifications;

use App\Models\MeetingBooking;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class MeetingRequestReceivedNotification extends Notification
{
    use Queueable;

    public function __construct(
        public MeetingBooking $booking
    ) {}

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $booking = $this->booking;

        return (new MailMessage)
            ->subject("New meeting request: {$booking->type_name}")
            ->markdown('emails.notifications.meeting-request-received', [
                'booking' => $booking,
                'host' => $notifiable,
            ]);
    }

    public function toArray(object $notifiable): array
    {
        $booking = $this->booking;

        return [
            'type' => 'meeting_request_received',
            'booking_id' => $booking->id,
            'meeting_type_name' => $booking->type_name,
            'guest_name' => $booking->guest_name,
            'start_time' => $booking->start_time->toIso8601String(),
            'end_time' => $booking->end_time->toIso8601String(),
            'title' => 'New Meeting Request',
            'body' => "{$booking->guest_name} requested a {$booking->type_name} meeting.",
        ];
    }
}
