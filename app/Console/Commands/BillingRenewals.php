<?php

namespace App\Console\Commands;

use App\Mail\RenewalReminderMail;
use App\Services\Billing\SubscriptionService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

/**
 * Queues renewal reminders at 14/7/3/1 days before a paid period ends.
 *
 * Card-on-file auto-charging is intentionally not performed here: it depends
 * on provider confirmation that Paystack/Hubtel support GHS recurring charges
 * for the configured merchant. Until then the member renews from billing and
 * keeps access through the grace window.
 */
class BillingRenewals extends Command
{
    protected $signature = 'billing:renewals';

    protected $description = 'Queue renewal reminders for upcoming membership periods';

    public function handle(SubscriptionService $subscriptions): int
    {
        $days = (array) config('roicard.billing.renewal_reminder_days', [14, 7, 3, 1]);
        $queued = 0;

        foreach ($days as $offset) {
            foreach ($subscriptions->renewalCandidates((int) $offset) as $subscription) {
                $user = $subscription->user;

                if (!$user || $user->isDeactivated() || $subscription->cancel_at_period_end) {
                    continue;
                }

                if (!$subscriptions->recordReminder($subscription, (int) $offset)) {
                    continue;
                }

                Mail::to($user)->queue(new RenewalReminderMail($user, $subscription, (int) $offset));
                $queued++;
            }
        }

        $this->info("Queued {$queued} renewal reminder(s).");

        return self::SUCCESS;
    }
}
