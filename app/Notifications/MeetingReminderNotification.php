<?php

namespace App\Notifications;

use App\Models\MeetingBooking;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class MeetingReminderNotification extends Notification
{
    use Queueable;

    public function __construct(
        public MeetingBooking $booking,
        public string $reminderType
    ) {}

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $booking = $this->booking;
        $label = $this->reminderType === '24h' ? 'tomorrow' : 'in 1 hour';
        $subject = "Reminder: {$booking->type_name} {$label}";

        return (new MailMessage)
            ->subject($subject)
            ->markdown('emails.notifications.meeting-reminder', [
                'booking' => $booking,
                'recipient' => $notifiable,
                'reminderType' => $this->reminderType,
            ]);
    }

    public function toArray(object $notifiable): array
    {
        $booking = $this->booking;
        $label = $this->reminderType === '24h' ? 'tomorrow' : 'in 1 hour';

        return [
            'type' => 'meeting_reminder',
            'booking_id' => $booking->id,
            'reminder_type' => $this->reminderType,
            'meeting_type_name' => $booking->type_name,
            'guest_name' => $booking->guest_name,
            'start_time' => $booking->start_time->toIso8601String(),
            'title' => 'Meeting Reminder',
            'body' => "Your {$booking->type_name} with {$booking->guest_name} is {$label}.",
        ];
    }
}
