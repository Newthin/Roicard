<?php

namespace App\Services\Billing;

use App\Models\Payment;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\SubscriptionEvent;
use App\Models\User;
use App\Mail\MembershipLapsedMail;
use App\Mail\PaymentReceiptMail;
use App\Services\Growth\CommissionService;
use App\Services\Growth\ExecutiveService;
use App\Services\Growth\MemberReferralCreditService;
use App\Services\MemberAccountService;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

/**
 * The only writer for subscription lifecycle state.
 *
 * Every entry point (checkout webhook/mock confirmation, admin grant,
 * cancellation, expiry) goes through this service so the audit trail and the
 * membership side effects stay consistent.
 */
class SubscriptionService
{
    public function __construct(
        protected PlanCatalog $catalog,
        protected EntitlementService $entitlements,
        protected MemberAccountService $accounts,
        protected ExecutiveService $executives,
        protected CommissionService $commissions,
        protected MemberReferralCreditService $memberCredits
    ) {}

    /**
     * Apply a successful payment exactly once. Legacy payments that carry no
     * plan (pre-subscription clients) are converted into founding access.
     */
    public function applyPaidPayment(Payment $payment): void
    {
        DB::transaction(function () use ($payment) {
            $payment->refresh();

            if ($payment->status !== 'success' || $payment->isApplied()) {
                return;
            }

            $user = User::find($payment->user_id);

            if (!$user) {
                return;
            }

            $plan = $payment->plan_id ? Plan::find($payment->plan_id) : null;

            if (!$plan) {
                $subscription = $this->writeFounding($user, 'legacy_payment', $payment);
                $this->accounts->activateMembership($user, true);
                $this->markApplied($payment, $subscription);
                $this->refreshAccess($user);

                return;
            }

            $periodStart = $payment->period_start ?? now();
            $periodEnd = $payment->period_end ?? $this->catalog->periodEnd($plan, $periodStart);

            $subscription = $this->writeSubscription(
                $user,
                $plan,
                $payment->purpose ?: Payment::PURPOSE_INITIAL,
                $periodStart,
                $periodEnd
            );

            $eventType = match ($payment->purpose) {
                Payment::PURPOSE_RENEWAL => 'renewed',
                Payment::PURPOSE_UPGRADE => 'upgraded',
                default => 'activated',
            };

            $this->recordEvent($subscription, $eventType, [
                'payment_id' => $payment->id,
                'amount' => (float) $payment->amount,
                'purpose' => $payment->purpose,
                'period_start' => $periodStart->toIso8601String(),
                'period_end' => $periodEnd?->toIso8601String(),
            ]);

            // A paid member is always published and routed to the dashboard.
            // The welcome email is only sent on the first onboarding
            // completion, so renewals never duplicate it.
            $this->accounts->activateMembership($user, true);

            $this->markApplied($payment, $subscription);

            // Growth Network: credit the referring Executive after the payment
            // is marked applied, so a duplicate webhook can never double-pay.
            $this->commissions->creditForPayment($payment, $subscription);

            // Normal-member referral credits and held checkout credits settle
            // on the same successful, already-applied payment.
            $this->memberCredits->earnForPayment($payment);
            $this->memberCredits->markUsedForPayment($payment);

            // Receipts confirm money that actually moved. Free/zero-priced
            // plans and admin grants never create a payable Payment row, and
            // legacy backfills carry no charge in this system. The isApplied()
            // guard above makes this once-only even if a webhook is replayed.
            if ((float) $payment->amount > 0 && $payment->purpose !== Payment::PURPOSE_LEGACY) {
                try {
                    Mail::to($user)->queue(new PaymentReceiptMail($user, $payment));
                } catch (\Throwable $e) {
                    // Mail must never block a successful payment or activation.
                    Log::warning('Failed to queue payment receipt email', [
                        'payment_id' => $payment->id,
                        'user_id' => $user->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            $this->refreshAccess($user);
        });
    }

    /**
     * Activate a plan without a payment row (100% campaign discount, full
     * upgrade credit, or a zero-priced plan).
     *
     * @param  array<string, mixed>  $quote
     */
    public function applyQuoteWithoutPayment(User $user, array $quote): Subscription
    {
        /** @var Plan $plan */
        $plan = $quote['plan'];
        $periodStart = !empty($quote['period_start']) ? Carbon::parse($quote['period_start']) : now();
        $periodEnd = !empty($quote['period_end']) ? Carbon::parse($quote['period_end']) : $this->catalog->periodEnd($plan, $periodStart);

        return DB::transaction(function () use ($user, $plan, $quote, $periodStart, $periodEnd) {
            $subscription = $this->writeSubscription(
                $user,
                $plan,
                $quote['purpose'] ?? Payment::PURPOSE_INITIAL,
                $periodStart,
                $periodEnd
            );

            $this->recordEvent($subscription, 'activated_without_payment', [
                'plan' => $plan->code,
                'purpose' => $quote['purpose'] ?? null,
                'amount' => $quote['amount'] ?? 0,
                'campaign' => $quote['campaign']['code'] ?? null,
            ]);

            if (!$plan->isFree()) {
                $this->accounts->activateMembership($user, true);
            }

            $this->refreshAccess($user);

            return $subscription;
        });
    }

    /**
     * Convert a legacy one-time payer (or an admin activation) into the
     * non-expiring founding plan.
     */
    public function grantFounding(User $user, string $source = 'admin_activation', bool $sendWelcome = false): Subscription
    {
        return DB::transaction(function () use ($user, $source, $sendWelcome) {
            $subscription = $this->writeFounding($user, $source, null);
            $this->accounts->activateMembership($user, $sendWelcome);
            $this->refreshAccess($user);

            return $subscription;
        });
    }

    /**
     * Give a member a paid plan without a payment (complimentary/comped).
     */
    public function grantPlan(
        User $user,
        string $planCode,
        ?CarbonInterface $endAt = null,
        bool $sendWelcome = false,
        string $source = 'admin_grant'
    ): Subscription {
        if ($planCode === Plan::FOUNDING) {
            return $this->grantFounding($user, $source, $sendWelcome);
        }

        $plan = $this->catalog->find($planCode);
        $periodStart = now();

        // Lifetime roles are permanent: an admin-supplied end date is ignored
        // so they can never silently expire or enter renewal/grace flows.
        $periodEnd = $plan->isLifetime()
            ? null
            : ($endAt ? Carbon::parse($endAt) : $this->catalog->periodEnd($plan, $periodStart));

        return DB::transaction(function () use ($user, $plan, $periodStart, $periodEnd, $source, $sendWelcome) {
            $subscription = $this->writeSubscription(
                $user,
                $plan,
                Payment::PURPOSE_ADMIN_GRANT,
                $periodStart,
                $periodEnd
            );

            $meta = $subscription->meta ?? [];
            $meta['source'] = $source;
            $subscription->forceFill(['meta' => $meta])->save();

            $this->recordEvent($subscription, 'plan_granted', [
                'plan' => $plan->code,
                'source' => $source,
                'period_end' => $periodEnd?->toIso8601String(),
            ]);

            if ($plan->code === Plan::EXECUTIVE) {
                $this->executives->ensureForUser($user);
            }

            $this->accounts->activateMembership($user, $sendWelcome);
            $this->refreshAccess($user);

            return $subscription;
        });
    }

    /** Cancel at period end (access continues until current_period_end). */
    public function cancel(User $user): Subscription
    {
        $subscription = $user->subscription()->with('plan')->first();

        if (!$subscription || !$subscription->isActive()) {
            throw ValidationException::withMessages([
                'subscription' => ['You do not have an active subscription to cancel.'],
            ]);
        }

        if ($subscription->isFounding()) {
            throw ValidationException::withMessages([
                'subscription' => ['Founding members have lifetime access and no recurring subscription.'],
            ]);
        }

        if ($subscription->isInternal()) {
            throw ValidationException::withMessages([
                'subscription' => ['Internal roles have permanent access and no recurring subscription.'],
            ]);
        }

        if ($subscription->status === Subscription::STATUS_CANCELED) {
            throw ValidationException::withMessages([
                'subscription' => ['This subscription is already cancelled.'],
            ]);
        }

        if (!$subscription->current_period_end) {
            return $this->revoke($user, 'canceled_no_period');
        }

        $subscription->forceFill([
            'cancel_at_period_end' => true,
            'canceled_at' => now(),
        ])->save();

        $this->recordEvent($subscription, 'canceled', [
            'effective_at' => $subscription->current_period_end->toIso8601String(),
        ]);

        $this->refreshAccess($user);

        return $subscription->fresh('plan');
    }

    /** Undo a pending cancellation. */
    public function resume(User $user): Subscription
    {
        $subscription = $user->subscription()->with('plan')->first();

        if (!$subscription || !$subscription->cancel_at_period_end) {
            throw ValidationException::withMessages([
                'subscription' => ['There is no pending cancellation to undo.'],
            ]);
        }

        if ($subscription->current_period_end && $subscription->current_period_end->isPast()) {
            throw ValidationException::withMessages([
                'subscription' => ['This subscription has already ended. Please start a new plan.'],
            ]);
        }

        $subscription->forceFill([
            'cancel_at_period_end' => false,
            'canceled_at' => null,
            'status' => Subscription::STATUS_ACTIVE,
        ])->save();

        $this->recordEvent($subscription, 'resumed', []);
        $this->refreshAccess($user);

        return $subscription->fresh('plan');
    }

    /** Immediate removal of access (admin deactivation/refund). */
    public function revoke(User $user, string $reason = 'admin_deactivation'): ?Subscription
    {
        return DB::transaction(function () use ($user, $reason) {
            $subscription = Subscription::where('user_id', $user->id)->lockForUpdate()->first();

            if ($subscription) {
                $subscription->forceFill([
                    'status' => Subscription::STATUS_CANCELED,
                    'cancel_at_period_end' => false,
                    'ended_at' => now(),
                    'grace_ends_at' => null,
                ])->save();

                $this->recordEvent($subscription, 'revoked', ['reason' => $reason]);

                // A revoked subscription did not deliver its paid period, so any
                // commission cleared against it is reversed. Natural expiry is
                // NOT reversed — the member received the full period there.
                $this->commissions->reverseForSubscription(
                    $subscription,
                    'subscription_revoked'
                );
            }

            $this->accounts->deactivateMembership($user);
            $this->refreshAccess($user);

            return $subscription?->fresh('plan');
        });
    }

    /**
     * Move due subscriptions into grace and expire anything past its grace
     * window. Returns the number of transitions for logging.
     *
     * @return array{grace:int, expired:int}
     */
    public function syncLifecycle(): array
    {
        $graceDays = (int) config('roicard.billing.grace_days', 7);
        $counts = ['grace' => 0, 'expired' => 0];

        Subscription::query()
            ->where('status', Subscription::STATUS_ACTIVE)
            ->whereNotNull('current_period_end')
            ->where('current_period_end', '<=', now())
            ->orderBy('id')
            ->chunkById(200, function ($subscriptions) use ($graceDays, &$counts) {
                foreach ($subscriptions as $subscription) {
                    if ($subscription->cancel_at_period_end) {
                        $this->expire($subscription);
                        $counts['expired']++;
                        continue;
                    }

                    $this->enterGrace($subscription, $graceDays);
                    $counts['grace']++;
                }
            });

        Subscription::query()
            ->where('status', Subscription::STATUS_GRACE)
            ->whereNotNull('grace_ends_at')
            ->where('grace_ends_at', '<=', now())
            ->orderBy('id')
            ->chunkById(200, function ($subscriptions) use (&$counts) {
                foreach ($subscriptions as $subscription) {
                    $this->expire($subscription);
                    $counts['expired']++;
                }
            });

        return $counts;
    }

    public function enterGrace(Subscription $subscription, int $graceDays = 7): void
    {
        if (!$subscription->current_period_end) {
            $this->expire($subscription);

            return;
        }

        $subscription->forceFill([
            'status' => Subscription::STATUS_GRACE,
            'grace_ends_at' => $subscription->current_period_end->copy()->addDays($graceDays),
        ])->save();

        $this->recordEvent($subscription, 'grace_started', [
            'grace_ends_at' => $subscription->grace_ends_at?->toIso8601String(),
        ]);
    }

    public function expire(Subscription $subscription): void
    {
        $subscription->forceFill([
            'status' => Subscription::STATUS_EXPIRED,
            'cancel_at_period_end' => false,
            'ended_at' => now(),
            'grace_ends_at' => null,
        ])->save();

        $this->recordEvent($subscription, 'expired', [
            'ended_at' => now()->toIso8601String(),
        ]);

        $user = $subscription->user;

        if ($user) {
            // Downgrade to the free plan: the account and public profile stay
            // published, but paid entitlements resolve to the free tier.
            // Member data is never deleted or hidden on expiry.
            $this->accounts->downgradeToFree($user);
            $this->refreshAccess($user);

            try {
                Mail::to($user)->queue(new MembershipLapsedMail($user));
            } catch (\Throwable $e) {
                Log::warning('Failed to queue membership lapsed email', [
                    'user_id' => $user->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    /** Canonical subscription payload for /me, /subscriptions/current and admin. */
    public function summary(User $user): array
    {
        $subscription = $user->subscription()->with('plan')->first();

        if ($subscription) {
            $user->setRelation('subscription', $subscription);
        }

        $entitlements = $this->entitlements->summary($user);

        return [
            'plan' => $entitlements['plan'],
            'plan_name' => $entitlements['plan_name'],
            'status' => $entitlements['status'],
            'is_active' => $entitlements['is_active'],
            'is_founding' => $entitlements['is_founding'],
            'is_internal' => $entitlements['is_internal'] ?? false,
            'started_at' => $subscription?->started_at?->toIso8601String(),
            'current_period_start' => $subscription?->current_period_start?->toIso8601String(),
            'current_period_end' => $subscription?->current_period_end?->toIso8601String(),
            'grace_ends_at' => $subscription?->grace_ends_at?->toIso8601String(),
            'cancel_at_period_end' => (bool) ($subscription?->cancel_at_period_end ?? false),
            'canceled_at' => $subscription?->canceled_at?->toIso8601String(),
            'ended_at' => $subscription?->ended_at?->toIso8601String(),
            'renews_at' => $subscription && !$subscription->isLifetime()
                ? $subscription->current_period_end?->toIso8601String()
                : null,
            'days_remaining' => $subscription?->daysRemaining(),
            'includes_card' => (bool) ($subscription?->plan?->includes_card ?? false),
            'price' => (float) ($subscription?->plan?->price ?? 0),
            'interval' => $subscription?->plan?->interval,
            'features' => $entitlements['features'],
            'limits' => $entitlements['limits'],
        ];
    }

    /**
     * Subscriptions whose paid period ends in exactly $days days. Used by the
     * renewal reminder command; the day offset makes each reminder idempotent
     * per billing period.
     *
     * @return \Illuminate\Database\Eloquent\Collection<int, Subscription>
     */
    public function renewalCandidates(int $days)
    {
        return Subscription::query()
            ->with(['user', 'plan'])
            ->where('status', Subscription::STATUS_ACTIVE)
            ->whereNotNull('current_period_end')
            ->whereDate('current_period_end', now()->addDays($days)->toDateString())
            ->get();
    }

    /** Record a renewal reminder at most once per subscription period. */
    public function recordReminder(Subscription $subscription, int $days): bool
    {
        $period = $subscription->current_period_end?->toDateString() ?? 'none';
        $key = "billing:reminder:{$subscription->id}:{$period}:{$days}";

        if (cache()->has($key)) {
            return false;
        }

        cache()->forever($key, true);

        $this->recordEvent($subscription, 'renewal_reminder', [
            'days_before' => $days,
            'period_end' => $subscription->current_period_end?->toIso8601String(),
        ]);

        return true;
    }

    /**
     * Paid, non-founding subscriptions whose period has ended and that should
     * be auto-charged (card on file) or moved to grace (manual MoMo).
     *
     * @return \Illuminate\Database\Eloquent\Collection<int, Subscription>
     */
    public function dueForCharge()
    {
        return Subscription::query()
            ->with(['user', 'plan'])
            ->where('status', Subscription::STATUS_ACTIVE)
            ->whereNotNull('current_period_end')
            ->where('current_period_end', '<=', now())
            ->where('cancel_at_period_end', false)
            ->get();
    }

    protected function writeSubscription(
        User $user,
        Plan $plan,
        string $purpose,
        CarbonInterface $periodStart,
        ?CarbonInterface $periodEnd
    ): Subscription {
        $subscription = Subscription::where('user_id', $user->id)->lockForUpdate()->first();

        $attributes = [
            'plan_id' => $plan->id,
            'status' => $plan->isFounding() ? Subscription::STATUS_FOUNDING : Subscription::STATUS_ACTIVE,
            'current_period_start' => $periodStart,
            'current_period_end' => $plan->isLifetime() ? null : $periodEnd,
            'grace_ends_at' => null,
            'cancel_at_period_end' => false,
            'canceled_at' => null,
            'ended_at' => null,
        ];

        if (!$subscription) {
            $subscription = new Subscription();
            $subscription->user_id = $user->id;
            $subscription->started_at = $periodStart;
        }

        $meta = $subscription->meta ?? [];
        $meta['last_purpose'] = $purpose;
        $meta['last_plan'] = $plan->code;
        $attributes['meta'] = $meta;

        $subscription->fill($attributes)->save();

        $this->refreshAccess($user);

        return $subscription->fresh('plan');
    }

    protected function writeFounding(User $user, string $source, ?Payment $payment): Subscription
    {
        $plan = $this->catalog->find(Plan::FOUNDING);
        $subscription = Subscription::where('user_id', $user->id)->lockForUpdate()->first();
        $startedAt = $subscription?->started_at
            ?? ($payment?->created_at ?? now());

        if (!$subscription) {
            $subscription = new Subscription();
            $subscription->user_id = $user->id;
        }

        $meta = $subscription->meta ?? [];
        $meta['source'] = $source;
        $meta['last_plan'] = Plan::FOUNDING;
        $meta['last_purpose'] = Payment::PURPOSE_LEGACY;
        if ($payment) {
            $meta['last_payment_id'] = $payment->id;
        }

        $subscription->fill([
            'plan_id' => $plan->id,
            'status' => Subscription::STATUS_FOUNDING,
            'started_at' => $startedAt,
            'current_period_start' => $subscription->current_period_start ?? $startedAt,
            'current_period_end' => null,
            'grace_ends_at' => null,
            'cancel_at_period_end' => false,
            'canceled_at' => null,
            'ended_at' => null,
            'meta' => $meta,
        ])->save();

        $this->recordEvent($subscription, 'founding_granted', [
            'source' => $source,
            'payment_id' => $payment?->id,
        ]);

        return $subscription->fresh('plan');
    }

    protected function markApplied(Payment $payment, Subscription $subscription): void
    {
        $meta = $payment->meta ?? [];
        $meta['applied_at'] = now()->toIso8601String();
        $meta['subscription_id'] = $subscription->id;

        $payment->forceFill([
            'subscription_id' => $subscription->id,
            'meta' => $meta,
        ])->saveQuietly();
    }

    protected function recordEvent(Subscription $subscription, string $type, array $data = []): void
    {
        SubscriptionEvent::create([
            'subscription_id' => $subscription->id,
            'user_id' => $subscription->user_id,
            'type' => $type,
            'data' => $data ?: null,
        ]);
    }

    /** Drop cached relations and bust cached payloads after a plan change. */
    protected function refreshAccess(User $user): void
    {
        // The public profile payload contains meeting types, which are only
        // exposed to paid hosts. A downgrade must take effect immediately
        // instead of leaving stale bookable types in the 1-hour page cache.
        $user->profile?->bustPublicCache();

        $user->unsetRelation('subscription');
        $user->unsetRelation('profile');
    }
}
