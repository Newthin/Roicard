<?php

namespace App\Services\Growth;

use App\Models\Commission;
use App\Models\ExecutiveReferral;
use App\Models\PayoutBatch;
use App\Models\PayoutBatchItem;
use App\Models\ReferralClick;
use App\Models\User;

/** Read-only Growth Network dashboard for the authenticated Executive. */
class ExecutiveDashboardService
{
    public function __construct(protected ExecutiveService $executives) {}

    /** @return array<string, mixed> */
    public function payload(User $user): array
    {
        $referral = $this->executives->ensureForUser($user);

        return [
            'referral' => $this->executives->payload($referral, $user),
            'summary' => $this->summary($user, $referral),
            'attributed_members' => $this->attributedMembers($user),
            'commissions' => $this->recentCommissions($user),
            'payouts' => $this->recentPayouts($user),
            'recent_clicks' => $this->recentClicks($referral->id),
        ];
    }

    /** @return array<string, mixed> */
    private function summary(User $user, ExecutiveReferral $referral): array
    {
        $commissions = Commission::where('executive_user_id', $user->id);
        $cleared = (float) (clone $commissions)
            ->where('status', Commission::STATUS_CLEARED)
            ->sum('amount');
        $unbatched = (float) (clone $commissions)
            ->where('status', Commission::STATUS_CLEARED)
            ->doesntHave('payoutBatchItem')
            ->sum('amount');

        $batchAmounts = PayoutBatchItem::query()
            ->join('payout_batches', 'payout_batches.id', '=', 'payout_batch_items.payout_batch_id')
            ->where('payout_batch_items.executive_user_id', $user->id)
            ->selectRaw('payout_batches.status as status, SUM(payout_batch_items.amount) as total')
            ->groupBy('payout_batches.status')
            ->pluck('total', 'status');

        $clicks = ReferralClick::where('executive_referral_id', $referral->id)->count();
        $members = User::where('referred_by_user_id', $user->id)->count();

        return [
            'currency' => 'GHS',
            'clicks' => $clicks,
            'registered_members' => $members,
            'cleared_commissions_count' => (int) (clone $commissions)
                ->where('status', Commission::STATUS_CLEARED)
                ->count(),
            'cleared_commissions_total' => $this->money($cleared),
            'unbatched_amount' => $this->money($unbatched),
            'pending_approval_amount' => $this->money((float) $batchAmounts->get(PayoutBatch::STATUS_PENDING, 0)),
            'approved_amount' => $this->money((float) $batchAmounts->get(PayoutBatch::STATUS_APPROVED, 0)),
            'paid_amount' => $this->money((float) $batchAmounts->get(PayoutBatch::STATUS_PAID, 0)),
        ];
    }

    /** @return array<int, array<string, mixed>> */
    private function attributedMembers(User $user): array
    {
        return User::where('referred_by_user_id', $user->id)
            ->with('subscription.plan:id,code,name')
            ->latest('referred_at')
            ->limit(10)
            ->get()
            ->map(fn (User $member) => [
                'id' => $member->id,
                'first_name' => $member->first_name,
                'last_name' => $member->last_name,
                'email' => $member->email,
                'plan' => $member->subscription?->plan?->code,
                'plan_name' => $member->subscription?->plan?->name,
                'membership_status' => $member->subscription?->status,
                'referred_at' => $member->referred_at?->toIso8601String(),
            ])
            ->all();
    }

    /** @return array<int, array<string, mixed>> */
    private function recentCommissions(User $user): array
    {
        return Commission::where('executive_user_id', $user->id)
            ->with([
                'member:id,first_name,last_name,email',
                'payoutBatchItem.batch:id,status,approved_at,paid_at',
            ])
            ->latest('cleared_at')
            ->limit(10)
            ->get()
            ->map(fn (Commission $commission) => [
                'id' => $commission->id,
                'member' => $commission->member
                    ? [
                        'id' => $commission->member->id,
                        'first_name' => $commission->member->first_name,
                        'last_name' => $commission->member->last_name,
                        'email' => $commission->member->email,
                    ]
                    : null,
                'type' => $commission->type,
                'amount' => $this->money((float) $commission->amount),
                'currency' => $commission->currency,
                'status' => $commission->status,
                'cleared_at' => $commission->cleared_at?->toIso8601String(),
                'cancelled_at' => $commission->cancelled_at?->toIso8601String(),
                'payout' => $commission->payoutBatchItem ? [
                    'batch_id' => $commission->payoutBatchItem->payout_batch_id,
                    'status' => $commission->payoutBatchItem->batch?->status,
                    'transfer_reference' => $commission->payoutBatchItem->transfer_reference,
                    'paid_at' => $commission->payoutBatchItem->paid_at?->toIso8601String(),
                ] : null,
            ])
            ->all();
    }

    /** @return array<int, array<string, mixed>> */
    private function recentPayouts(User $user): array
    {
        return PayoutBatch::whereHas('items', fn ($query) => $query
            ->where('executive_user_id', $user->id))
            ->with(['items' => fn ($query) => $query
                ->where('executive_user_id', $user->id)
                ->select('payout_batch_id', 'transfer_reference', 'status', 'amount')])
            ->latest()
            ->limit(10)
            ->get()
            ->map(fn (PayoutBatch $batch) => [
                'id' => $batch->id,
                'amount' => $this->money((float) $batch->total_amount),
                'currency' => $batch->currency,
                'status' => $batch->status,
                'commission_count' => $batch->items->count(),
                'transfer_references' => $batch->items
                    ->pluck('transfer_reference')
                    ->filter()
                    ->values()
                    ->all(),
                'created_at' => $batch->created_at?->toIso8601String(),
                'approved_at' => $batch->approved_at?->toIso8601String(),
                'paid_at' => $batch->paid_at?->toIso8601String(),
            ])
            ->all();
    }

    /** @return array<int, array<string, mixed>> */
    private function recentClicks(int $referralId): array
    {
        return ReferralClick::where('executive_referral_id', $referralId)
            ->with('user:id,first_name,last_name,email')
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn (ReferralClick $click) => [
                'id' => $click->id,
                'referrer' => $click->referrer,
                'user_agent' => $click->user_agent,
                'created_at' => $click->created_at?->toIso8601String(),
                'registered_user' => $click->user
                    ? [
                        'id' => $click->user->id,
                        'first_name' => $click->user->first_name,
                        'last_name' => $click->user->last_name,
                        'email' => $click->user->email,
                    ]
                    : null,
            ])
            ->all();
    }

    private function money(float $amount): string
    {
        return number_format($amount, 2, '.', '');
    }
}
