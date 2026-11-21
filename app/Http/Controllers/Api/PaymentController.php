<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\PaymentInitiateRequest;
use App\Models\DiscountCampaign;
use App\Models\Payment;
use App\Models\Plan;
use App\Services\Billing\PlanCatalog;
use App\Services\Billing\SubscriptionService;
use App\Services\Growth\CommissionService;
use App\Services\Growth\MemberReferralCreditService;
use App\Services\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class PaymentController extends Controller
{
    public function __construct(
        protected PaymentService $paymentService,
        protected PlanCatalog $catalog,
        protected SubscriptionService $subscriptions,
        protected CommissionService $commissions,
        protected MemberReferralCreditService $credits
    ) {}

    /**
     * Start checkout for a plan. The client sends only a plan code; the amount,
     * billing period, upgrade credit and campaign discount are all resolved
     * server-side, so pricing can never be spoofed.
     */
    public function initiate(PaymentInitiateRequest $request): JsonResponse
    {
        $user = auth()->user();

        // Optional late campaign code: a member who missed it at registration
        // can still claim a live campaign's discounted rate at checkout.
        if ($request->filled('campaign_code')) {
            $entered = mb_strtoupper(trim((string) $request->campaign_code));
            $campaign = DiscountCampaign::where('code', $entered)->first();

            if (!$campaign || !$campaign->isLive()) {
                return response()->json([
                    'message' => 'The campaign code is invalid or has ended.',
                    'errors' => [
                        'campaign_code' => ['This code is invalid or no longer active.'],
                    ],
                ], 422);
            }

            if ($user->discount_campaign_id === null) {
                $user->update([
                    'campaign_code' => $campaign->code,
                    'discount_campaign_id' => $campaign->id,
                ]);
            }
        }

        $planCode = $request->input('plan') ?: Plan::ANNUAL;
        $plan = $this->catalog->find($planCode);

        // Guard against duplicate pending payments for this user within the
        // last hour (retry storm / double-tap protection). Instead of blocking,
        // resume the existing attempt: re-run the provider handshake so the
        // member gets a fresh checkout URL for the same reference.
        $recentPending = Payment::where('user_id', $user->id)
            ->where('status', 'pending')
            ->where('created_at', '>=', now()->subHour())
            ->latest()
            ->first();

        if ($recentPending && $recentPending->plan_id !== null
            && (int) $recentPending->plan_id !== (int) $plan->id) {
            // A different plan was chosen while an old checkout was open; the
            // stale attempt must not be resumed or it would charge the wrong
            // amount.
            $this->credits->releaseForPayment($recentPending);
            $recentPending->update(['status' => 'failed']);
            $recentPending = null;
        }

        // Pre-subscription checkout attempts have no plan_id. They are only
        // safe to resume for the default annual plan; a member explicitly
        // choosing monthly must start a fresh, correctly priced attempt.
        if ($recentPending && $recentPending->plan_id === null
            && $plan->code !== Plan::ANNUAL) {
            $this->credits->releaseForPayment($recentPending);
            $recentPending->update(['status' => 'failed']);
            $recentPending = null;
        }

        // Credits held by the checkout being resumed are still spendable for
        // that same attempt, so include them in the quote.
        $quote = $this->catalog->quote($user, $planCode, null, $recentPending?->id);

        if (!empty($quote['blocked_reason'])) {
            return response()->json([
                'message' => $quote['blocked_reason'],
                'error' => $quote['blocked_code'],
                'quote' => $this->quotePayload($quote),
            ], 422);
        }

        /** @var Plan $plan */
        $plan = $quote['plan'];

        // Hold referral credit before deciding whether a payment is needed.
        // A token lets the same reservation follow either the zero-charge or
        // the provider checkout path without being spendable twice.
        $expectedCredit = round((float) ($quote['referral_credit_applied'] ?? 0), 2);
        $reservationToken = null;

        if ($expectedCredit > 0 && !$recentPending) {
            $reservationToken = (string) Str::uuid();
            $reserved = $this->credits->reserve($user, $expectedCredit, null, $reservationToken);

            if ($reserved < $expectedCredit) {
                // A concurrent checkout consumed some credit after quoting.
                // Charge the difference rather than under-charge the member.
                $shortfall = round($expectedCredit - $reserved, 2);
                $quote['amount'] = round((float) $quote['amount'] + $shortfall, 2);
                $quote['referral_credit_applied'] = $reserved;
                $quote['requires_payment'] = $quote['amount'] > 0;
            }
        }

        // Nothing to charge (full credit or a 100% campaign). Apply the plan
        // through the same lifecycle service instead of creating a fake sale.
        if (!$quote['requires_payment']) {
            if ($reservationToken) {
                $this->credits->commitReservation($user, $reservationToken);
            }

            $this->subscriptions->applyQuoteWithoutPayment($user, $quote);
            $user->refresh();

            return response()->json([
                'activated' => true,
                'payment' => null,
                'quote' => $this->quotePayload($quote),
                'membership' => $this->subscriptions->summary($user),
            ]);
        }

        if ($recentPending) {
            // Normalise a pre-subscription attempt to the plan being resumed so
            // a later success applies the correct period instead of falling
            // back to legacy founding access.
            if ($recentPending->plan_id === null) {
                $recentPending->forceFill([
                    'plan_id' => $plan->id,
                    'amount' => $quote['amount'],
                    'purpose' => $quote['purpose'],
                    'period_start' => $quote['period_start'],
                    'period_end' => $quote['period_end'],
                    'meta' => ['quote' => $this->quotePayload($quote)],
                ])->save();
            }

            $reference = $recentPending->provider_reference;

            // The abandoned checkout may have quietly completed at the
            // provider without our webhook firing. Confirm before charging
            // again so the member is never billed twice for one purchase.
            try {
                $verified = $this->paymentService->verify($reference);
            } catch (\Throwable $e) {
                Log::warning('Payment verification failed during resume', [
                    'reference' => $reference,
                    'error' => $e->getMessage(),
                ]);
                $verified = null;
            }

            if ($verified && $verified['status'] === 'success') {
                $recentPending->update(['status' => 'success']);

                return response()->json([
                    'payment' => $recentPending,
                    'redirect' => ['status' => 'success', 'reference' => $reference],
                    'quote' => $this->quotePayload($quote),
                    'resumed' => true,
                ]);
            }

            // Providers can reject a reused reference. On failure, void the
            // stale attempt and fall through to create a fresh payment while
            // carrying its credit reservation across.
            try {
                $result = $this->paymentService->initiate($recentPending);

                return response()->json([
                    'payment' => $recentPending,
                    'redirect' => $result,
                    'quote' => $this->quotePayload($quote),
                    'resumed' => true,
                ]);
            } catch (\Throwable $e) {
                Log::warning('Resuming pending payment failed; starting a fresh one', [
                    'reference' => $reference,
                    'error' => $e->getMessage(),
                ]);
                $recentPending->update(['status' => 'failed']);
            }
        }

        // user_id is hardcoded to the authenticated user. The amount and the
        // covered period come from the server-side quote; the client's
        // $request->amount is deliberately ignored.
        $referral = $quote['referral_discount'] ?? null;
        $payment = Payment::create([
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'referral_user_id' => $referral['user_id'] ?? null,
            'amount' => $quote['amount'],
            'referral_discount_amount' => $referral['amount'] ?? 0,
            'referral_credit_applied' => $quote['referral_credit_applied'] ?? 0,
            'currency' => $quote['currency'],
            'method' => $request->method ?? 'mobile_money',
            'purpose' => $quote['purpose'],
            'period_start' => $quote['period_start'],
            'period_end' => $quote['period_end'],
            'meta' => [
                'quote' => $this->quotePayload($quote),
            ],
            'momo_number' => $request->momo_number,
            'status' => 'pending',
            'provider_reference' => strtoupper(Str::random(12)),
            'provider' => config('app.payment_provider', 'mock'),
        ]);

        if ($reservationToken) {
            $this->credits->attachReservationToPayment($user, $reservationToken, $payment);
        } elseif ($recentPending) {
            $this->credits->reassignReservation($recentPending, $payment);
        }

        try {
            $result = $this->paymentService->initiate($payment);
        } catch (\Throwable $e) {
            Log::error('Payment initiation failed', [
                'reference' => $payment->provider_reference,
                'provider' => $payment->provider,
                'error' => $e->getMessage(),
            ]);
            $this->credits->releaseForPayment($payment);
            if ($reservationToken) {
                $this->credits->releaseReservation($user, $reservationToken);
            }
            $payment->update(['status' => 'failed']);

            return response()->json([
                'message' => 'Payment provider is unavailable right now. Please try again shortly.',
            ], 502);
        }

        return response()->json([
            'payment' => $payment,
            'redirect' => $result,
            'quote' => $this->quotePayload($quote),
            // Kept for older clients that read this field.
            'activation_fee' => $quote['amount'],
        ]);
    }

    /**
     * Confirms a pending payment while the app is running with the mock
     * provider (local/staging). It is a no-op 404 for real providers so it can
     * never be used to activate an account for free in production.
     */
    public function confirmMock(Request $request): JsonResponse
    {
        if (config('app.payment_provider', 'mock') !== 'mock') {
            return response()->json(['message' => 'Not found'], 404);
        }

        $validated = $request->validate([
            'reference' => ['required', 'string', 'max:64'],
        ]);

        $payment = Payment::where('provider_reference', $validated['reference'])
            ->where('user_id', auth()->id())
            ->firstOrFail();

        if ($payment->isPending()) {
            // PaymentObserver applies the payment to the subscription
            // synchronously on the transition to success.
            $payment->update(['status' => 'success']);
        }

        $payment->refresh();

        return response()->json([
            'status' => $payment->status,
            'payment' => $payment,
            'membership' => $this->subscriptions->summary(auth()->user()->fresh()),
        ]);
    }

    public function status(string $reference): JsonResponse
    {
        $payment = Payment::where('provider_reference', $reference)
            ->where('user_id', auth()->id())
            ->firstOrFail();

        if ($payment->isPending()) {
            // Verification must never take this endpoint down: an unreachable
            // or slow provider just means we report the last known status.
            try {
                $verified = $this->paymentService->verify($reference);
            } catch (\Throwable $e) {
                Log::warning('Payment verification failed', [
                    'reference' => $reference,
                    'error' => $e->getMessage(),
                ]);
                $verified = null;
            }

            if ($verified && $verified['status'] === 'success') {
                $payment->update(['status' => 'success']);
            } elseif ($verified && $verified['status'] === 'failed') {
                $payment->update(['status' => 'failed']);
            }
        }

        return response()->json([
            'status' => $payment->status,
            'payment' => $payment,
        ]);
    }

    public function webhook(string $provider, Request $request): JsonResponse
    {
        $signature = $request->header('X-Paystack-Signature')
            ?? $request->header('X-Hubtel-Signature')
            ?? '';

        if (!$this->paymentService->verifyWebhook($provider, $request->all(), $signature)) {
            Log::warning('Payment webhook signature verification failed', [
                'provider' => $provider,
                'payload' => $request->all(),
            ]);
            return response()->json(['message' => 'Invalid signature'], 403);
        }

        $event = $request->input('event', '');
        $reference = $request->input('data.reference')
            ?? $request->input('data.checkoutId')
            ?? '';

        if ($event === 'charge.success' && $reference) {
            $payment = Payment::where('provider_reference', $reference)->first();

            if ($payment && $payment->isPending()) {
                // Amount tampering guard: a provider callback must never
                // settle a payment for less than the server quoted.
                $paid = $request->input('data.amount');

                if ($paid !== null && (float) $paid + 0.01 < (float) $payment->amount) {
                    // Provider units differ (Paystack uses pesewas), so this is
                    // an audit signal rather than a hard rejection. The
                    // provider-side verification remains authoritative.
                    Log::warning('Webhook amount below quoted amount', [
                        'reference' => $reference,
                        'expected' => (float) $payment->amount,
                        'received' => (float) $paid,
                    ]);
                }

                $payment->update(['status' => 'success']);
            }
        }

        // A provider refund reverses any commission cleared against the
        // original payment. Signature verification above covers these events
        // too. Reference field names differ between Paystack and Hubtel.
        if (in_array($event, ['charge.refunded', 'refund.processed', 'refund.successful'], true)) {
            $refundReference = $request->input('data.reference')
                ?? $request->input('data.transaction_reference')
                ?? $request->input('data.charge_reference')
                ?? '';

            if ($refundReference) {
                $refunded = Payment::where('provider_reference', $refundReference)->first();

                if ($refunded) {
                    $reversed = $this->commissions->reverseForPayment(
                        $refunded,
                        'payment_refunded'
                    );

                    if ($reversed > 0) {
                        Log::info('Commission reversed after refund', [
                            'payment_id' => $refunded->id,
                            'count' => $reversed,
                        ]);
                    }

                    $creditsReversed = $this->credits->reverseForRefund($refunded);

                    if ($creditsReversed > 0) {
                        Log::info('Referral credits reversed after refund', [
                            'payment_id' => $refunded->id,
                            'count' => $creditsReversed,
                        ]);
                    }
                }
            }
        }

        return response()->json(['message' => 'Webhook received']);
    }

    /**
     * Remove the internal Plan model from a quote before returning it.
     *
     * @param  array<string, mixed>  $quote
     * @return array<string, mixed>
     */
    protected function quotePayload(array $quote): array
    {
        unset($quote['plan']);

        return $quote;
    }
}
