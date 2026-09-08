<?php

namespace App\Jobs;

use App\Models\MeetingBooking;
use App\Notifications\MeetingReminderNotification;
use App\Services\GuestNotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;

class SendMeetingReminderJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 60;

    public function __construct(
        public MeetingBooking $booking,
        public string $reminderType
    ) {}

    public function handle(): void
    {
        $cacheKey = "meeting_reminder:{$this->booking->id}:{$this->reminderType}";

        if (!Cache::add($cacheKey, true, now()->addHours(25))) {
            return;
        }

        $booking = $this->booking->fresh(['host', 'meetingType']);

        if (!$booking) {
            return;
        }

        if (in_array($booking->status, [
            MeetingBooking::STATUS_CANCELLED,
            MeetingBooking::STATUS_DECLINED,
            MeetingBooking::STATUS_EXPIRED,
        ])) {
            return;
        }

        if ($booking->start_time->isPast()) {
            return;
        }

        if ($booking->host) {
            $booking->host->notify(new MeetingReminderNotification($booking, $this->reminderType));
        }

        app(GuestNotificationService::class)->sendReminder($booking, $this->reminderType);
    }
}
