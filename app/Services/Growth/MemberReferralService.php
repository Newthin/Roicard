<?php

namespace App\Services\Growth;

use App\Models\ExecutiveReferral;
use App\Models\Payment;
use App\Models\Plan;
use App\Models\ReferralClick;
use App\Models\User;

/**
 * Normal-member referral identity, discount policy and read-only reporting.
 *
 * Codes live in the existing `executive_referrals` table so Executive cash
 * commissions and member discounts share one attribution path. This service
 * owns the eligibility rules and the member-facing view; cash payouts remain
 * entirely in CommissionService/PayoutService.
 */
class MemberReferralService
{
    public function __construct(protected ExecutiveService $executives) {}

    /** A verified, active member may refer; internal staff and admins may not. */
    public function isEligibleReferrer(User $user): bool
    {
        if ($user->email_verified_at === null
            || $user->isDeactivated()
            || $user->isSuspendedByAdmin()
            || $user->isAdmin()) {
            return false;
        }

        // A revoked Executive must not keep a usable referral code even though
        // the underlying account is otherwise a normal verified member.
        $subscription = $user->subscription()->with('plan')->first();
        $planCode = $subscription?->plan?->code;

        if ($planCode === Plan::EXECUTIVE && !$this->executives->isExecutive($user)) {
            return false;
        }

        return !($planCode === Plan::STAFF && $subscription?->isActive());
    }

    /**
     * Whether a code may be visited and attributed.
     *
     * This is deliberately broader than normal-member discount eligibility:
     * an explicit Executive grant is the source of truth for the cash
     * commission flow even when that account also has the admin role. Executive
     * links still never create member discounts (see discountForQuote()).
     */
    public function canUseReferralCode(User $user): bool
    {
        if ($user->email_verified_at === null
            || $user->isDeactivated()
            || $user->isSuspendedByAdmin()) {
            return false;
        }

        return $this->executives->isExecutive($user) || $this->isEligibleReferrer($user);
    }

    public function forUser(User $user): ?ExecutiveReferral
    {
        return $this->executives->forUser($user);
    }

    public function ensureForUser(User $user): ?ExecutiveReferral
    {
        return $this->isEligibleReferrer($user)
            ? $this->executives->ensureForUser($user)
            : null;
    }

    public function findByCode(string $code): ?ExecutiveReferral
    {
        $referral = $this->executives->findByCode($code);

        return $referral && $this->canUseReferralCode($referral->user) ? $referral : null;
    }

    /** @return array<string, mixed>|null */
    public function payload(User $user): ?array
    {
        $referral = $this->forUser($user) ?? $this->ensureForUser($user);

        return $referral ? $this->executives->payload($referral, $user) : null;
    }

    /**
     * Calculate the referred member's first-purchase discount.
     *
     * Never stacks with a campaign, never applies to renewals/upgrades, never
     * applies to an Executive link (which keeps its cash commission), and never
     * rewards a member who has already paid for a membership.
     *
     * @param  array<string, mixed>  $quote
     * @return array<string, mixed>|null
     */
    public function discountForQuote(User $member, array $quote): ?array
    {
        if (!empty($quote['blocked_reason'])
            || ($quote['purpose'] ?? null) !== Payment::PURPOSE_INITIAL
            || !empty($quote['campaign'])) {
            return null;
        }

        $referrerId = $member->referred_by_user_id;

        if (!$referrerId || (int) $referrerId === (int) $member->id) {
            return null;
        }

        $referrer = User::find($referrerId);

        if (!$referrer
            || !$this->isEligibleReferrer($referrer)
            || $this->executives->isExecutive($referrer)
            || $this->hasPurchasedMembership($member)) {
            return null;
        }

        $amount = round(max(0, (float) ($quote['amount'] ?? 0)), 2);
        $rate = (float) config('roicard.growth.member_referral.discount_rate', 0.03);
        $cap = (float) config('roicard.growth.member_referral.discount_cap', 50);
        $discount = round(min($amount * $rate, $cap), 2);

        if ($discount <= 0) {
            return null;
        }

        $referral = $this->forUser($referrer) ?? $this->executives->ensureForUser($referrer);

        return [
            'user_id' => $referrer->id,
            'code' => $referral->code,
            'amount' => $discount,
            'rate' => $rate,
            'cap' => $cap,
        ];
    }

    /** Has this member ever completed a real membership purchase? */
    public function hasPurchasedMembership(User $member): bool
    {
        return $member->payments()
            ->where('status', 'success')
            ->whereNotNull('plan_id')
            ->whereIn('purpose', [
                Payment::PURPOSE_INITIAL,
                Payment::PURPOSE_RENEWAL,
                Payment::PURPOSE_UPGRADE,
                Payment::PURPOSE_LEGACY,
            ])
            ->exists();
    }

    /**
     * Read-only dashboard payload. Credits and history are supplied by the
     * credit service so this service never mutates payment or credit state.
     *
     * @return array<string, mixed>
     */
    public function dashboard(User $user, MemberReferralCreditService $credits): array
    {
        $eligible = $this->isEligibleReferrer($user);
        $referral = $eligible ? $this->payload($user) : null;

        $referralId = $referral['id'] ?? null;
        $clicks = $referralId
            ? ReferralClick::where('executive_referral_id', $referralId)
            : ReferralClick::query()->whereRaw('1 = 0');

        $members = $user->referredMembers()
            ->with(['subscription.plan'])
            ->latest('referred_at')
            ->get();

        $recentClicks = (clone $clicks)->with('user')->latest('created_at')->limit(8)->get();

        return [
            'eligible' => $eligible,
            'referral' => $referral,
            'summary' => [
                'currency' => config('roicard.billing.currency', 'GHS'),
                'clicks' => $clicks->count(),
                'registered_members' => $members->count(),
                'credits_earned' => number_format((float) $credits->earnedTotal($user), 2, '.', ''),
                'credits_used' => number_format((float) $credits->usedTotal($user), 2, '.', ''),
                'available_balance' => number_format((float) $credits->availableBalance($user), 2, '.', ''),
                'cancelled_amount' => number_format((float) $credits->cancelledTotal($user), 2, '.', ''),
            ],
            'attributed_members' => $members->map(function (User $member) {
                $subscription = $member->subscription;

                return [
                    'id' => $member->id,
                    'first_name' => $member->first_name,
                    'last_name' => $member->last_name,
                    'email' => $member->email,
                    'plan' => $subscription?->plan?->code,
                    'plan_name' => $subscription?->plan?->name,
                    'membership_status' => $subscription?->status,
                    'referred_at' => $member->referred_at?->toIso8601String(),
                ];
            })->all(),
            'credits' => $credits->history($user),
            'recent_clicks' => $recentClicks->map(fn (ReferralClick $click) => [
                'id' => $click->id,
                'referrer' => $click->referrer,
                'user_agent' => $click->user_agent,
                'created_at' => $click->created_at?->toIso8601String(),
                'registered_user' => $click->user ? [
                    'id' => $click->user->id,
                    'first_name' => $click->user->first_name,
                    'last_name' => $click->user->last_name,
                    'email' => $click->user->email,
                ] : null,
            ])->all(),
        ];
    }
}
