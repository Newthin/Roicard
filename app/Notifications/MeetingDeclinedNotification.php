<?php

namespace App\Notifications;

use App\Models\MeetingBooking;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class MeetingDeclinedNotification extends Notification
{
    use Queueable;

    public function __construct(
        public MeetingBooking $booking,
        public ?string $reason = null
    ) {}

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $booking = $this->booking;

        return (new MailMessage)
            ->subject("Meeting declined: {$booking->type_name}")
            ->markdown('emails.notifications.meeting-declined', [
                'booking' => $booking,
                'recipient' => $notifiable,
                'reason' => $this->reason,
            ]);
    }

    public function toArray(object $notifiable): array
    {
        $booking = $this->booking;

        return [
            'type' => 'meeting_declined',
            'booking_id' => $booking->id,
            'meeting_type_name' => $booking->type_name,
            'guest_name' => $booking->guest_name,
            'start_time' => $booking->start_time->toIso8601String(),
            'reason' => $this->reason,
            'title' => 'Meeting Declined',
            'body' => "Your {$booking->type_name} with {$booking->guest_name} has been declined.",
        ];
    }
}
