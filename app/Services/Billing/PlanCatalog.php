<?php

namespace App\Services\Billing;

use App\Models\DiscountCampaign;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\User;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Validation\ValidationException;

/**
 * The single source of truth for what a member should be charged.
 *
 * The client never supplies an amount. It may choose a plan code; everything
 * else (initial vs renewal, upgrade credit, campaign discount, billing period)
 * is derived here.
 */
class PlanCatalog
{
    /** Public plans for the pricing page, ordered for display. */
    public function publicPlans(): Collection
    {
        return Plan::query()
            ->publiclyVisible()
            ->orderBy('sort_order')
            ->get();
    }

    /** Every plan, including founding (admin screens). */
    public function allPlans(): Collection
    {
        return Plan::query()->orderBy('sort_order')->get();
    }

    public function find(string $code): Plan
    {
        return Plan::where('code', $code)->firstOrFail();
    }

    public function periodEnd(Plan $plan, CarbonInterface $start): ?CarbonInterface
    {
        $date = Carbon::parse($start);

        return match ($plan->interval) {
            'month' => $date->copy()->addMonthNoOverflow(),
            'year' => $date->copy()->addYearNoOverflow(),
            default => null,
        };
    }

    /** Has this member ever been issued a physical card (or paid for one)? */
    public function hasIssuedCard(User $user): bool
    {
        if ($user->smartCard()->exists()) {
            return true;
        }

        return $user->payments()
            ->where('status', 'success')
            ->where(function ($query) {
                $query->whereIn('purpose', [
                    \App\Models\Payment::PURPOSE_INITIAL,
                    \App\Models\Payment::PURPOSE_LEGACY,
                ])->orWhereNull('plan_id');
            })
            ->exists();
    }

    /** The member's live campaign, if any (explicit FK first, then code). */
    public function campaignFor(User $user): ?DiscountCampaign
    {
        $campaign = null;

        if ($user->discount_campaign_id) {
            $campaign = DiscountCampaign::find($user->discount_campaign_id);
        }

        if (!$campaign && $user->campaign_code) {
            $campaign = DiscountCampaign::where('code', $user->campaign_code)->first();
        }

        return $campaign && $campaign->isLive() ? $campaign : null;
    }

    /**
     * Price a plan for this member right now.
     *
     * @return array<string, mixed>
     */
    public function quote(User $user, ?string $planCode = null, ?DiscountCampaign $campaign = null): array
    {
        $planCode = $planCode ?: Plan::ANNUAL;
        $plan = $this->find($planCode);

        if (!$plan->is_active) {
            throw ValidationException::withMessages([
                'plan' => ['This plan is not available right now.'],
            ]);
        }

        $existing = $user->subscription()->with('plan')->first();
        $previousPayer = $this->hasIssuedCard($user);
        $campaign = $campaign ?: $this->campaignFor($user);

        $purpose = 'initial';
        $amount = (float) $plan->initial_price;
        $credit = 0.0;
        $periodStart = now();
        $periodEnd = $this->periodEnd($plan, $periodStart);
        $blocked = null;
        $blockedCode = null;

        if ($plan->isFree()) {
            $blocked = 'The free plan does not require a payment.';
            $blockedCode = 'plan_requires_no_payment';
            $amount = 0;
            $purpose = 'none';
        } elseif ($plan->isFounding()) {
            $blocked = 'The founding plan cannot be purchased.';
            $blockedCode = 'plan_not_purchasable';
            $amount = 0;
            $purpose = 'none';
        } elseif ($plan->isInternal()) {
            $blocked = 'This plan is assigned by an administrator and cannot be purchased.';
            $blockedCode = 'plan_not_purchasable';
            $amount = 0;
            $purpose = 'none';
        } elseif ($existing && $existing->isFounding()) {
            $blocked = 'Your account already has lifetime founding access.';
            $blockedCode = 'already_founding';
            $amount = 0;
            $purpose = 'none';
        } elseif (!$existing && $user->status === 'active' && !$user->isAdmin()) {
            // Legacy active account that has not been backfilled yet.
            $blocked = 'Your account already has lifetime access.';
            $blockedCode = 'already_founding';
            $amount = 0;
            $purpose = 'none';
        } elseif ($existing && $existing->isActive()
            && $existing->plan?->code === Plan::ANNUAL
            && $plan->code === Plan::MONTHLY) {
            // Downgrades are not mid-term switches; the annual member simply
            // renews annually (or cancels at period end).
            $blocked = 'You are on the annual plan. You can renew annually or cancel at the end of your period.';
            $blockedCode = 'annual_downgrade_not_allowed';
            $amount = 0;
            $purpose = 'none';
        } else {
            [$purpose, $amount, $credit, $periodStart, $periodEnd] = $this->resolvePrice(
                $user,
                $plan,
                $existing,
                $previousPayer
            );
        }

        $original = $amount;

        if ($blocked === null && $campaign && $campaign->isLive() && $purpose === 'initial') {
            $campaignAmount = (float) $campaign->amount;

            if ($campaignAmount < $amount) {
                $amount = $campaignAmount;
            }
        }

        $amount = round(max(0, $amount), 2);
        $original = round(max(0, $original), 2);

        return [
            'plan' => $plan,
            'plan_code' => $plan->code,
            'plan_name' => $plan->name,
            'currency' => $plan->currency,
            'purpose' => $purpose,
            'amount' => $amount,
            'original_amount' => $original,
            'discount_amount' => round(max(0, $original - $amount), 2),
            'credit_applied' => round(max(0, $credit), 2),
            'initial_price' => (float) $plan->initial_price,
            'recurring_price' => (float) $plan->price,
            'interval' => $plan->interval,
            'includes_card' => (bool) $plan->includes_card,
            'period_start' => $periodStart?->toIso8601String(),
            'period_end' => $periodEnd?->toIso8601String(),
            'next_payment_at' => $periodEnd?->toIso8601String(),
            'requires_payment' => $blocked === null && $amount > 0,
            'is_renewal' => $purpose === 'renewal',
            'is_upgrade' => $purpose === 'upgrade',
            'blocked_reason' => $blocked,
            'blocked_code' => $blockedCode,
            'campaign' => $campaign ? [
                'code' => $campaign->code,
                'name' => $campaign->name,
                'amount' => (float) $campaign->amount,
            ] : null,
            'schedule' => $this->schedule($plan),
        ];
    }

    /**
     * @return array{0:string,1:float,2:float,3:CarbonInterface,4:CarbonInterface|null}
     */
    protected function resolvePrice(
        User $user,
        Plan $plan,
        ?Subscription $existing,
        bool $previousPayer
    ): array {
        $now = now();

        if ($existing && $existing->isActive()) {
            $existingPlan = $existing->plan?->code;

            // Same plan: a normal renewal at the recurring price.
            if ($existing->plan_id === $plan->id) {
                $start = $existing->current_period_end && $existing->current_period_end->isFuture()
                    ? $existing->current_period_end->copy()
                    : $now;

                return ['renewal', (float) $plan->price, 0.0, $start, $this->periodEnd($plan, $start)];
            }

            // Monthly -> annual: credit unused time on the current period.
            if ($existingPlan === Plan::MONTHLY && $plan->code === Plan::ANNUAL) {
                $credit = $this->unusedMonthlyCredit($existing);
                $amount = max(0, (float) $plan->initial_price - $credit);

                return ['upgrade', $amount, $credit, $now, $this->periodEnd($plan, $now)];
            }

            // Any other switch (e.g. annual -> monthly) is not a new card sale.
            return ['renewal', (float) $plan->price, 0.0, $now, $this->periodEnd($plan, $now)];
        }

        // Grace retains access but the period has ended: charge the renewal
        // price and start a fresh period now.
        if ($existing && $existing->status === Subscription::STATUS_GRACE) {
            return ['renewal', (float) $plan->price, 0.0, $now, $this->periodEnd($plan, $now)];
        }

        // Lapsed member who already received a card does not pay for another.
        if ($previousPayer) {
            return ['renewal', (float) $plan->price, 0.0, $now, $this->periodEnd($plan, $now)];
        }

        return ['initial', (float) $plan->initial_price, 0.0, $now, $this->periodEnd($plan, $now)];
    }

    /**
     * Pro-rated credit for the unused part of a monthly period, valued at the
     * monthly recurring price. Capped at one month.
     */
    public function unusedMonthlyCredit(Subscription $subscription): float
    {
        $end = $subscription->current_period_end;
        $start = $subscription->current_period_start ?? $subscription->started_at;

        if (!$end || !$start || $end->isPast()) {
            return 0.0;
        }

        $total = max(1, $end->getTimestamp() - $start->getTimestamp());
        $remaining = max(0, $end->getTimestamp() - now()->getTimestamp());
        $monthlyPrice = (float) $this->find(Plan::MONTHLY)->price;

        return round($monthlyPrice * min(1, $remaining / $total), 2);
    }

    /**
     * First-year and ongoing totals shown on the pricing page. These are
     * illustrative only; the charged amount always comes from the quote.
     *
     * @return array{year_one:float, year_two_plus:float|null, savings_vs_monthly:float|null}
     */
    public function schedule(Plan $plan): array
    {
        if ($plan->code === Plan::MONTHLY) {
            return [
                'year_one' => round((float) $plan->initial_price + (11 * (float) $plan->price), 2),
                'year_two_plus' => round(12 * (float) $plan->price, 2),
                'savings_vs_monthly' => null,
            ];
        }

        if ($plan->code === Plan::ANNUAL) {
            $monthly = $this->find(Plan::MONTHLY);
            $monthlyYearOne = (float) $monthly->initial_price + (11 * (float) $monthly->price);

            return [
                'year_one' => (float) $plan->initial_price,
                'year_two_plus' => (float) $plan->price,
                'savings_vs_monthly' => round(max(0, $monthlyYearOne - (float) $plan->initial_price), 2),
            ];
        }

        return ['year_one' => 0.0, 'year_two_plus' => null, 'savings_vs_monthly' => null];
    }

    /**
     * Legacy `activation_fee` field kept for older clients. It always reflects
     * the annual first payment (including a live campaign discount).
     */
    public function legacyActivationFee(User $user): float
    {
        $quote = $this->quote($user, Plan::ANNUAL);

        return (float) $quote['amount'];
    }
}
