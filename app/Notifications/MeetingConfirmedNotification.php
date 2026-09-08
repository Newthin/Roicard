<?php

namespace App\Notifications;

use App\Models\MeetingBooking;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class MeetingConfirmedNotification extends Notification
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
        $icsContent = app(\App\Services\IcsService::class)->generateContent($booking);
        $icsFilename = app(\App\Services\IcsService::class)->generateFilename($booking);

        return (new MailMessage)
            ->subject("Meeting confirmed: {$booking->type_name}")
            ->markdown('emails.notifications.meeting-confirmed', [
                'booking' => $booking,
                'recipient' => $notifiable,
            ])
            ->attachData($icsContent, $icsFilename, [
                'mime' => 'text/calendar; charset=utf-8',
            ]);
    }

    public function toArray(object $notifiable): array
    {
        $booking = $this->booking;

        return [
            'type' => 'meeting_confirmed',
            'booking_id' => $booking->id,
            'meeting_type_name' => $booking->type_name,
            'guest_name' => $booking->guest_name,
            'start_time' => $booking->start_time->toIso8601String(),
            'end_time' => $booking->end_time->toIso8601String(),
            'title' => 'Meeting Confirmed',
            'body' => "Your {$booking->type_name} with {$booking->guest_name} has been confirmed.",
        ];
    }
}
