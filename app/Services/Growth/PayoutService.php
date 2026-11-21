<?php

namespace App\Services\Growth;

use App\Models\Commission;
use App\Models\PayoutBatch;
use App\Models\PayoutBatchItem;
use App\Models\PayoutSetting;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Growth Network item 4 — payout batching and finance approval.
 *
 * Cleared commissions are grouped per Executive. Only executives reaching the
 * configured minimum are batched; smaller balances roll over to the next run.
 * Batches start as `pending` and are approved by an admin. Transfer references
 * and CSV export belong to the next item and are deliberately absent here.
 */
class PayoutService
{
    public function settings(): PayoutSetting
    {
        return PayoutSetting::current();
    }

    /** @param array<string, mixed> $data */
    public function updateSettings(array $data): PayoutSetting
    {
        $settings = $this->settings();
        $settings->fill($data)->save();

        return $settings->fresh();
    }

    /**
     * Build batches for eligible Executives. Idempotent: a commission already
     * in a batch is never included again. The scheduled call respects the
     * cadence window; an admin-forced call bypasses only that timing guard.
     *
     * @return Collection<int, PayoutBatch>
     */
    public function generateBatches(bool $force = false, ?User $triggeredBy = null): Collection
    {
        $settings = $this->settings();

        if (!$settings->is_enabled) {
            return new Collection();
        }

        $windowEnd = now();
        $last = $settings->last_generated_at;

        if (!$force && $last && $last->diffInDays($windowEnd) < $settings->cadence_days) {
            return new Collection();
        }

        $windowStart = $last ? $last->copy() : $windowEnd->copy()->subDays($settings->cadence_days);
        $minimum = (float) $settings->minimum_amount;
        $currency = config('roicard.billing.currency', 'GHS');

        $groups = Commission::query()
            ->cleared()
            ->whereDoesntHave('payoutBatchItem')
            ->with('executive')
            ->orderBy('cleared_at')
            ->get()
            ->groupBy('executive_user_id');

        $created = new Collection();

        foreach ($groups as $commissions) {
            $total = $commissions->sum(fn (Commission $commission) => (float) $commission->amount);

            if ($total + 0.00001 < $minimum) {
                continue;
            }

            $batch = DB::transaction(function () use ($commissions, $windowStart, $windowEnd, $currency, $triggeredBy) {
                $batch = PayoutBatch::create([
                    'period_start' => $windowStart,
                    'period_end' => $windowEnd,
                    'total_amount' => 0,
                    'currency' => $currency,
                    'status' => PayoutBatch::STATUS_PENDING,
                    'created_by_user_id' => $triggeredBy?->id,
                ]);

                $included = 0.0;

                foreach ($commissions as $commission) {
                    // The unique commission_id is the final double-pay guard.
                    $item = PayoutBatchItem::firstOrCreate(
                        ['commission_id' => $commission->id],
                        [
                            'payout_batch_id' => $batch->id,
                            'executive_user_id' => $commission->executive_user_id,
                            'amount' => $commission->amount,
                            'currency' => $commission->currency ?: $currency,
                            'status' => PayoutBatchItem::STATUS_PENDING,
                        ]
                    );

                    if ($item->wasRecentlyCreated) {
                        $included += (float) $item->amount;
                    }
                }

                $batch->update(['total_amount' => round($included, 2)]);

                return $batch;
            });

            $created->push($batch->fresh('items'));
        }

        $settings->forceFill(['last_generated_at' => $windowEnd])->save();

        return $created;
    }

    /** Approve a pending batch. Admin identity is recorded on the batch. */
    public function approveBatch(PayoutBatch $batch, User $admin): PayoutBatch
    {
        if (!$batch->isPending()) {
            throw ValidationException::withMessages([
                'batch' => 'Only pending payout batches can be approved.',
            ]);
        }

        DB::transaction(function () use ($batch, $admin) {
            $batch->forceFill([
                'status' => PayoutBatch::STATUS_APPROVED,
                'approved_by_user_id' => $admin->id,
                'approved_at' => now(),
            ])->save();

            $batch->items()->update(['status' => PayoutBatchItem::STATUS_APPROVED]);
        });

        return $batch->fresh('items');
    }

    /**
     * Remove a reversed commission from a still-pending batch and adjust the
     * total. Approved batches are left intact — finance has already signed off
     * and the reversal stays visible in the commission ledger.
     */
    public function detachReversedCommission(Commission $commission): void
    {
        $item = $commission->payoutBatchItem;

        if (!$item) {
            return;
        }

        $batch = $item->batch;

        if (!$batch || !$batch->isPending()) {
            return;
        }

        DB::transaction(function () use ($item, $batch) {
            $item->delete();

            if ($batch->items()->count() === 0) {
                $batch->delete();

                return;
            }

            $batch->update(['total_amount' => round((float) $batch->items()->sum('amount'), 2)]);
        });
    }
}
