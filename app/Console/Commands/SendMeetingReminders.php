<?php

namespace App\Console\Commands;

use App\Jobs\SendMeetingReminderJob;
use App\Models\MeetingBooking;
use Carbon\Carbon;
use Illuminate\Console\Command;

/**
 * Dispatch meeting reminders for upcoming bookings.
 *
 * Two reminder windows:
 *   - 24h: bookings starting between 23.5h and 24.5h from now
 *   - 1h:  bookings starting between 30min and 1.5h from now
 *
 * Each reminder is idempotent — SendMeetingReminderJob uses Cache::add()
 * to prevent duplicate sends even if this command runs multiple times.
 *
 * Run manually:  php artisan meetings:reminders
 * Scheduled:     every 15 minutes via routes/console.php
 */
class SendMeetingReminders extends Command
{
    protected $signature = 'meetings:reminders';

    protected $description = 'Dispatch reminders for upcoming confirmed meetings';

    public function handle(): int
    {
        $now = Carbon::now('UTC');

        $this->dispatchReminders('24h', $now->copy()->addHours(23.5), $now->copy()->addHours(24.5));
        $this->dispatchReminders('1h', $now->copy()->addMinutes(30), $now->copy()->addMinutes(90));

        return self::SUCCESS;
    }

    protected function dispatchReminders(string $type, Carbon $from, Carbon $to): void
    {
        $bookings = MeetingBooking::where('status', MeetingBooking::STATUS_CONFIRMED)
            ->whereBetween('start_time', [$from, $to])
            ->get();

        foreach ($bookings as $booking) {
            SendMeetingReminderJob::dispatch($booking, $type);
        }

        $this->info("Dispatched {$bookings->count()} '{$type}' reminders.");
    }
}
