<?php

namespace App\Services\Growth;

use App\Models\ExecutiveReferral;
use App\Models\MemberReferralCredit;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Non-cash referral credit movements.
 *
 * Credits are earned only after a referred member's first payment succeeds,
 * reserved while a checkout is pending, and consumed only when that payment is
 * applied. Refunds of the earning payment cancel the credit (or post a negative
 * adjustment when it was already spent).
 */
class MemberReferralCreditService
{
    /** Spendable balance, optionally including credits held by one payment. */
    public function availableBalance(User $user, ?int $includeReservedPaymentId = null): float
    {
        $spendable = MemberReferralCredit::where('user_id', $user->id)
            ->where(function ($query) use ($includeReservedPaymentId) {
                $query->where('status', MemberReferralCredit::STATUS_AVAILABLE);

                if ($includeReservedPaymentId) {
                    $query->orWhere(function ($reserved) use ($includeReservedPaymentId) {
                        $reserved->where('status', MemberReferralCredit::STATUS_RESERVED)
                            ->where('reserved_payment_id', $includeReservedPaymentId);
                    });
                }
            })
            ->where(function ($query) {
                $query->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->sum('amount');

        $adjustments = MemberReferralCredit::where('user_id', $user->id)
            ->where('status', MemberReferralCredit::STATUS_ADJUSTMENT)
            ->sum('amount');

        return round(max(0, (float) $spendable + (float) $adjustments), 2);
    }

    public function earnedTotal(User $user): float
    {
        return round((float) MemberReferralCredit::where('user_id', $user->id)
            ->whereIn('status', [
                MemberReferralCredit::STATUS_AVAILABLE,
                MemberReferralCredit::STATUS_RESERVED,
                MemberReferralCredit::STATUS_USED,
            ])
            ->sum('amount'), 2);
    }

    public function usedTotal(User $user): float
    {
        return round((float) MemberReferralCredit::where('user_id', $user->id)
            ->where('status', MemberReferralCredit::STATUS_USED)
            ->sum('amount'), 2);
    }

    public function cancelledTotal(User $user): float
    {
        // Adjustment rows are ledger counter-movements for an already-cancelled
        // credit; counting both would double-report the same reversed value.
        return round(abs((float) MemberReferralCredit::where('user_id', $user->id)
            ->where('status', MemberReferralCredit::STATUS_CANCELLED)
            ->sum('amount')), 2);
    }

    /**
     * Hold the oldest-expiring credits for a checkout. Returns the amount
     * actually reserved so the caller can reconcile the quoted total.
     */
    public function reserve(
        User $user,
        float $amount,
        ?Payment $payment = null,
        ?string $token = null
    ): float {
        $amount = round(max(0, $amount), 2);

        if ($amount === 0.0) {
            return 0.0;
        }

        return DB::transaction(function () use ($user, $amount, $payment, $token) {
            $rows = MemberReferralCredit::where('user_id', $user->id)
                ->where('status', MemberReferralCredit::STATUS_AVAILABLE)
                ->where(function ($query) {
                    $query->whereNull('expires_at')->orWhere('expires_at', '>', now());
                })
                ->orderBy('expires_at')
                ->orderBy('id')
                ->lockForUpdate()
                ->get();

            $remaining = $amount;

            foreach ($rows as $credit) {
                $rowAmount = round((float) $credit->amount, 2);
                $take = round(min($remaining, $rowAmount), 2);

                if ($take <= 0) {
                    continue;
                }

                if ($take < $rowAmount - 0.001) {
                    $this->splitRemaining($credit, round($rowAmount - $take, 2));
                }

                $meta = $credit->meta ?? [];
                $meta['last_reserved_at'] = now()->toIso8601String();

                if ($token) {
                    $meta['reservation_token'] = $token;
                }

                // A token lets checkout hold credits before a payment row
                // exists. Without one, a direct call consumes immediately.
                $hold = (bool) ($payment || $token);

                $credit->update([
                    'amount' => $take,
                    'status' => $hold
                        ? MemberReferralCredit::STATUS_RESERVED
                        : MemberReferralCredit::STATUS_USED,
                    'reserved_at' => $hold ? now() : null,
                    'reserved_payment_id' => $payment?->id,
                    'used_at' => $hold ? null : now(),
                    'used_payment_id' => null,
                    'meta' => $meta,
                ]);

                $remaining = round($remaining - $take, 2);

                if ($remaining <= 0) {
                    break;
                }
            }

            return round($amount - $remaining, 2);
        });
    }

    /** Attach a checkout reservation to its newly created payment row. */
    public function attachReservationToPayment(User $user, string $token, Payment $payment): void
    {
        MemberReferralCredit::where('user_id', $user->id)
            ->where('status', MemberReferralCredit::STATUS_RESERVED)
            ->where('meta->reservation_token', $token)
            ->update([
                'reserved_payment_id' => $payment->id,
                'reserved_at' => now(),
            ]);
    }

    /** Complete a reservation that activated a plan without a payment row. */
    public function commitReservation(User $user, string $token): void
    {
        MemberReferralCredit::where('user_id', $user->id)
            ->where('status', MemberReferralCredit::STATUS_RESERVED)
            ->where('meta->reservation_token', $token)
            ->update([
                'status' => MemberReferralCredit::STATUS_USED,
                'used_at' => now(),
            ]);
    }

    /** Release a reservation when checkout never produced a payment. */
    public function releaseReservation(User $user, string $token): void
    {
        MemberReferralCredit::where('user_id', $user->id)
            ->where('status', MemberReferralCredit::STATUS_RESERVED)
            ->where('meta->reservation_token', $token)
            ->update([
                'status' => MemberReferralCredit::STATUS_AVAILABLE,
                'reserved_at' => null,
                'reserved_payment_id' => null,
            ]);
    }

    /** Move a held reservation from a voided checkout to its replacement. */
    public function reassignReservation(Payment $from, Payment $to): void
    {
        MemberReferralCredit::where('status', MemberReferralCredit::STATUS_RESERVED)
            ->where('reserved_payment_id', $from->id)
            ->update([
                'reserved_payment_id' => $to->id,
                'reserved_at' => now(),
            ]);
    }

    /** Credits held for a successful payment become permanently used. */
    public function markUsedForPayment(Payment $payment): void
    {
        MemberReferralCredit::where('status', MemberReferralCredit::STATUS_RESERVED)
            ->where('reserved_payment_id', $payment->id)
            ->update([
                'status' => MemberReferralCredit::STATUS_USED,
                'used_at' => now(),
                'used_payment_id' => $payment->id,
            ]);
    }

    /** A failed or replaced checkout releases its held credits. */
    public function releaseForPayment(Payment $payment): void
    {
        MemberReferralCredit::where('status', MemberReferralCredit::STATUS_RESERVED)
            ->where('reserved_payment_id', $payment->id)
            ->update([
                'status' => MemberReferralCredit::STATUS_AVAILABLE,
                'reserved_at' => null,
                'reserved_payment_id' => null,
            ]);
    }

    /**
     * Credit the referrer after the referred member's payment is applied.
     * Idempotent on the originating payment.
     */
    public function earnForPayment(Payment $payment): ?MemberReferralCredit
    {
        $discount = round((float) $payment->referral_discount_amount, 2);

        if ($discount <= 0 || !$payment->referral_user_id) {
            return null;
        }

        $existing = MemberReferralCredit::where('earned_from_payment_id', $payment->id)->first();

        if ($existing) {
            return $existing;
        }

        $months = max(1, (int) config('roicard.growth.member_referral.credit_months', 12));
        $referral = null;
        $code = $payment->meta['referral_discount']['code'] ?? null;

        if (is_string($code)) {
            $referral = ExecutiveReferral::where('code', strtoupper($code))->first();
        }

        return MemberReferralCredit::firstOrCreate(
            ['earned_from_payment_id' => $payment->id],
            [
                'user_id' => $payment->referral_user_id,
                'member_user_id' => $payment->user_id,
                'executive_referral_id' => $referral?->id,
                'amount' => $discount,
                'currency' => $payment->currency ?: config('roicard.billing.currency', 'GHS'),
                'status' => MemberReferralCredit::STATUS_AVAILABLE,
                'expires_at' => now()->addMonths($months),
                'meta' => [
                    'source' => 'member_referral',
                    'payment_reference' => $payment->provider_reference,
                    'member_id' => $payment->user_id,
                ],
            ]
        );
    }

    /**
     * Refund handling: cancel the credit earned by this payment and give back
     * credits this payment consumed. A spent credit becomes a negative
     * adjustment so the referrer cannot keep its value.
     */
    public function reverseForRefund(Payment $payment): int
    {
        return DB::transaction(function () use ($payment) {
            $count = 0;

            MemberReferralCredit::where('earned_from_payment_id', $payment->id)
                ->get()
                ->each(function (MemberReferralCredit $credit) use (&$count, $payment) {
                    if ($credit->status === MemberReferralCredit::STATUS_USED) {
                        MemberReferralCredit::create([
                            'user_id' => $credit->user_id,
                            'amount' => -abs((float) $credit->amount),
                            'currency' => $credit->currency,
                            'status' => MemberReferralCredit::STATUS_ADJUSTMENT,
                            'meta' => [
                                'source' => 'refund_adjustment',
                                'credit_id' => $credit->id,
                                'payment_reference' => $payment->provider_reference,
                            ],
                        ]);
                    }

                    $credit->update([
                        'status' => MemberReferralCredit::STATUS_CANCELLED,
                        'reserved_at' => null,
                        'reserved_payment_id' => null,
                    ]);

                    $count++;
                });

            MemberReferralCredit::where('status', MemberReferralCredit::STATUS_USED)
                ->where('used_payment_id', $payment->id)
                ->get()
                ->each(function (MemberReferralCredit $credit) use (&$count) {
                    if ($credit->expires_at && $credit->expires_at->isPast()) {
                        return;
                    }

                    $credit->update([
                        'status' => MemberReferralCredit::STATUS_AVAILABLE,
                        'used_at' => null,
                        'used_payment_id' => null,
                    ]);

                    $count++;
                });

            return $count;
        });
    }

    /** @return array<int, array<string, mixed>> */
    public function history(User $user): array
    {
        return MemberReferralCredit::where('user_id', $user->id)
            ->with(['member:id,first_name,last_name,email', 'earnedFromPayment:id,provider_reference'])
            ->latest()
            ->limit(20)
            ->get()
            ->map(fn (MemberReferralCredit $credit) => [
                'id' => $credit->id,
                'member' => $credit->member ? [
                    'id' => $credit->member->id,
                    'first_name' => $credit->member->first_name,
                    'last_name' => $credit->member->last_name,
                    'email' => $credit->member->email,
                ] : null,
                'amount' => number_format((float) $credit->amount, 2, '.', ''),
                'currency' => $credit->currency,
                'status' => $credit->status,
                'payment_reference' => $credit->earnedFromPayment?->provider_reference,
                'expires_at' => $credit->expires_at?->toIso8601String(),
                'created_at' => $credit->created_at?->toIso8601String(),
                'used_at' => $credit->used_at?->toIso8601String(),
            ])->all();
    }

    /** Keep the original expiry and audit trail when part of a credit is spent. */
    private function splitRemaining(MemberReferralCredit $credit, float $amount): void
    {
        MemberReferralCredit::create([
            'user_id' => $credit->user_id,
            'earned_from_payment_id' => $credit->earned_from_payment_id,
            'member_user_id' => $credit->member_user_id,
            'executive_referral_id' => $credit->executive_referral_id,
            'amount' => $amount,
            'currency' => $credit->currency,
            'status' => MemberReferralCredit::STATUS_AVAILABLE,
            'expires_at' => $credit->expires_at,
            'meta' => $credit->meta,
        ]);
    }
}
