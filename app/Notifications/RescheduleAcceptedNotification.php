<?php

namespace App\Notifications;

use App\Models\MeetingBooking;
use App\Models\MeetingRescheduleRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class RescheduleAcceptedNotification extends Notification
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
        $icsContent = app(\App\Services\IcsService::class)->generateContent($booking);
        $icsFilename = app(\App\Services\IcsService::class)->generateFilename($booking);

        return (new MailMessage)
            ->subject("Reschedule accepted: {$booking->type_name}")
            ->markdown('emails.notifications.reschedule-accepted', [
                'booking' => $booking,
                'rescheduleRequest' => $request,
                'recipient' => $notifiable,
            ])
            ->attachData($icsContent, $icsFilename, [
                'mime' => 'text/calendar; charset=utf-8',
            ]);
    }

    public function toArray(object $notifiable): array
    {
        $booking = $this->booking;
        $request = $this->rescheduleRequest;

        return [
            'type' => 'reschedule_accepted',
            'booking_id' => $booking->id,
            'reschedule_request_id' => $request->id,
            'meeting_type_name' => $booking->type_name,
            'guest_name' => $booking->guest_name,
            'new_start_time' => $request->proposed_start_time->toIso8601String(),
            'new_end_time' => $request->proposed_end_time->toIso8601String(),
            'title' => 'Reschedule Accepted',
            'body' => "The reschedule for your {$booking->type_name} meeting has been accepted. New time: {$request->proposed_start_time->format('M d, Y g:i A')}.",
        ];
    }
}
