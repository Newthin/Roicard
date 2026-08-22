<?php

namespace App\Console\Commands;

use App\Mail\DraftClosureMail;
use App\Mail\DraftFinalNoticeMail;
use App\Mail\DraftReminderMail;
use App\Mail\DraftUrgentReminderMail;
use App\Models\SmartCard;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;

/**
 * Draft expiration sequence — members who skip activation.
 *
 * A draft member has 7 days from registration (created_at) to activate:
 *
 *   Day 3  gentle reminder          DraftReminderMail
 *   Day 6  urgency                  DraftUrgentReminderMail
 *   Day 7  final notice             DraftFinalNoticeMail
 *   Day 8  closure + card release   DraftClosureMail
 *
 * Day 8 closes the account (soft delete — data is retained on the back end
 * but the account, profile, and profile link become inaccessible; restoring
 * is not offered, a returning user starts fresh) and releases any reserved
 * Smart Card back to available inventory so the Day 6 copy stays true.
 *
 * Cohorts are matched by exact created_at date. Reminders are additionally
 * guarded by a permanent cache flag per user+step, so re-runs (manual or
 * overlapping schedules) never double-send; closure is naturally guarded by
 * the soft-delete check. Requires the daily `schedule:run` cron — a missed
 * day skips that cohort's step entirely, same caveat as users:purge.
 *
 * Run manually:  php artisan drafts:expiration-reminders
 * Scheduled:     daily via routes/console.php
 */
class SendDraftExpirationReminders extends Command
{
    protected $signature = 'drafts:expiration-reminders {--day= : Only run a specific step (3, 6, 7, or 8)}';

    protected $description = 'Send draft expiration reminders and close expired draft accounts';

    public function handle(): int
    {
        $only = $this->option('day') ? (int) $this->option('day') : null;

        if ($only === null || $only === 3) {
            $this->remind(3, DraftReminderMail::class);
        }
        if ($only === null || $only === 6) {
            $this->remind(6, DraftUrgentReminderMail::class);
        }
        if ($only === null || $only === 7) {
            $this->remind(7, DraftFinalNoticeMail::class);
        }
        if ($only === null || $only === 8) {
            $this->close();
        }

        return self::SUCCESS;
    }

    /**
     * Draft members registered exactly N days ago get the day-N email.
     * Admins are never included in the sequence.
     */
    private function remind(int $daysAgo, string $mailable): void
    {
        $users = $this->draftCohort($daysAgo)->get();
        $queued = 0;

        foreach ($users as $user) {
            // Permanent per-user/per-step flag prevents duplicate sends if
            // the command runs more than once within the matching window.
            $flag = "draft_sequence:{$user->id}:day{$daysAgo}";
            if (Cache::has($flag)) {
                continue;
            }
            Cache::forever($flag, true);

            Mail::to($user)->queue(new $mailable($user));
            $queued++;
        }

        $this->info("Day {$daysAgo}: queued {$queued} reminder(s).");
    }

    /**
     * Close the day-8 cohort: release reserved cards, then soft-delete the
     * account and send the closure confirmation. The mail takes the first
     * name as a plain string because the model is trashed by the time the
     * queued job renders it.
     */
    private function close(): void
    {
        $users = $this->draftCohort(8)->get();
        $released = 0;

        foreach ($users as $user) {
            // Release any reserved/assigned cards back to available inventory,
            // mirroring the admin unassign flow.
            $released += SmartCard::where('user_id', $user->id)
                ->whereIn('inventory_status', [SmartCard::STATUS_ASSIGNED, SmartCard::STATUS_ACTIVE])
                ->update([
                    'user_id' => null,
                    'inventory_status' => SmartCard::STATUS_AVAILABLE,
                    'assigned_at' => null,
                ]);

            Mail::to($user)->queue(new DraftClosureMail($user->first_name));

            $user->delete();
        }

        $this->info("Day 8: closed {$users->count()} account(s), released {$released} card(s).");
    }

    private function draftCohort(int $daysAgo)
    {
        return User::query()
            ->where('status', 'draft')
            ->where('role', 'member')
            ->whereNull('deleted_at')
            ->whereDate('created_at', '=', now()->subDays($daysAgo)->toDateString());
    }
}
