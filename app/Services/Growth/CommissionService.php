<?php

namespace App\Services\Growth;

use App\Models\Commission;
use App\Models\ExecutiveReferral;
use App\Models\Payment;
use App\Models\Plan;
use App\Models\ReferralClick;
use App\Models\Subscription;
use App\Models\User;
use App\Services\Billing\EntitlementService;

/**
 * Growth Network item 3 — cash commission ledger.
 *
 * Commissions are credited once per qualifying payment and clear immediately.
 * Only a referred member's first annual purchase (new sale or monthly -> annual
 * upgrade) can earn. Renewals, monthly sales, admin grants and legacy payments
 * never do. A discounted sale is capped at a share of the collected revenue.
 *
 * Payout batches, approval and CSV export are deliberately not part of this
 * item.
 */
class CommissionService
{
    public function __construct(
        protected ExecutiveService $executives,
        protected EntitlementService $entitlements
    ) {}

    /**
     * Credit a successful, applied payment. Idempotent: one row per payment.
     * Returns null when the payment does not qualify or has no active
     * attribution.
     */
    public function creditForPayment(
        Payment $payment,
        ?Subscription $subscription = null
    ): ?Commission {
        if (!$payment->isCompleted() || !$payment->isApplied()) {
            return null;
        }

        $member = $payment->user;

        if (!$member || !$member->referred_by_user_id) {
            return null;
        }

        $executive = User::find($member->referred_by_user_id);

        if (!$executive
            || !$this->executives->isExecutive($executive)
            || !$this->entitlements->allows($executive, 'earns_commission')) {
            return null;
        }

        $plan = $payment->plan;

        if (!$plan || $plan->code !== Plan::ANNUAL) {
            return null;
        }

        $type = $this->typeFor($payment);

        if (!$type) {
            return null;
        }

        // "First annual sale" means once per member. A later re-purchase must
        // not earn a second full commission after an upgrade already did.
        if ($this->memberHasAnnualCommission($member->id)) {
            return null;
        }

        $amount = $this->amountFor($type, (float) $payment->amount);

        if ($amount <= 0) {
            return null;
        }

        $referral = $this->executives->forUser($executive)
            ?: $this->executives->ensureForUser($executive);

        $quote = $payment->meta['quote'] ?? [];
        $click = $this->clickForMember($member);

        return Commission::firstOrCreate(
            ['payment_id' => $payment->id],
            [
                'executive_user_id' => $executive->id,
                'member_user_id' => $member->id,
                'executive_referral_id' => $referral->id,
                'referral_click_id' => $click?->id,
                'subscription_id' => $subscription?->id ?? $payment->subscription_id,
                'type' => $type,
                'amount' => $amount,
                'collected_amount' => (float) $payment->amount,
                'currency' => $payment->currency ?: config('roicard.billing.currency', 'GHS'),
                'status' => Commission::STATUS_CLEARED,
                'cleared_at' => now(),
                'meta' => [
                    'purpose' => $payment->purpose,
                    'plan' => $plan->code,
                    'campaign' => $quote['campaign']['code'] ?? $member->campaign_code,
                    'discount_amount' => $quote['discount_amount'] ?? 0,
                ],
            ]
        );
    }

    /** Reverse every still-cleared commission for a payment (refund/reversal). */
    public function reverseForPayment(Payment $payment, string $reason): int
    {
        return $this->reverse(
            Commission::where('payment_id', $payment->id),
            $reason
        );
    }

    /** Reverse every still-cleared commission tied to a subscription. */
    public function reverseForSubscription(Subscription $subscription, string $reason): int
    {
        return $this->reverse(
            Commission::where('subscription_id', $subscription->id),
            $reason
        );
    }

    /** @param \Illuminate\Database\Eloquent\Builder<Commission> $query */
    private function reverse($query, string $reason): int
    {
        return $query->where('status', Commission::STATUS_CLEARED)->update([
            'status' => Commission::STATUS_CANCELLED,
            'cancelled_at' => now(),
            'cancellation_reason' => $reason,
        ]);
    }

    private function typeFor(Payment $payment): ?string
    {
        if ($payment->purpose === Payment::PURPOSE_UPGRADE) {
            return Commission::TYPE_ANNUAL_UPGRADE;
        }

        if ($payment->purpose !== Payment::PURPOSE_INITIAL) {
            return null;
        }

        $quote = $payment->meta['quote'] ?? [];
        $discounted = (float) ($quote['discount_amount'] ?? 0) > 0
            || !empty($quote['campaign']['code']);

        return $discounted
            ? Commission::TYPE_DISCOUNTED_ANNUAL
            : Commission::TYPE_FIRST_ANNUAL;
    }

    private function amountFor(string $type, float $collected): float
    {
        if ($type === Commission::TYPE_ANNUAL_UPGRADE) {
            return (float) config('roicard.growth.commission.upgrade', 50);
        }

        $annual = (float) config('roicard.growth.commission.annual', 100);

        if ($type === Commission::TYPE_DISCOUNTED_ANNUAL) {
            $rate = (float) config('roicard.growth.commission.discount_rate', 0.30);

            return round(min($annual, $collected * $rate), 2);
        }

        return $annual;
    }

    private function memberHasAnnualCommission(int $memberId): bool
    {
        return Commission::where('member_user_id', $memberId)
            ->whereIn('type', [
                Commission::TYPE_FIRST_ANNUAL,
                Commission::TYPE_ANNUAL_UPGRADE,
                Commission::TYPE_DISCOUNTED_ANNUAL,
            ])
            ->exists();
    }

    private function clickForMember(User $member): ?ReferralClick
    {
        return ReferralClick::where('user_id', $member->id)
            ->latest()
            ->first();
    }
}
