<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\PaymentInitiateRequest;
use App\Models\Payment;
use App\Models\User;
use App\Services\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class PaymentController extends Controller
{
    public function __construct(
        protected PaymentService $paymentService
    ) {}

    public function initiate(PaymentInitiateRequest $request): JsonResponse
    {
        $user = auth()->user();

        if ($user->isActive()) {
            return response()->json(['message' => 'Account already active'], 400);
        }

        // Guard against duplicate pending payments for this user within the
        // last hour (retry storm / double-tap protection). Instead of blocking,
        // resume the existing attempt: re-run the provider handshake so the
        // member gets a fresh checkout URL for the same reference.
        $recentPending = Payment::where('user_id', $user->id)
            ->where('status', 'pending')
            ->where('created_at', '>=', now()->subHour())
            ->latest()
            ->first();

        if ($recentPending) {
            $reference = $recentPending->provider_reference;

            // The abandoned checkout may have quietly completed at the
            // provider without our webhook firing. Confirm before charging
            // again so the member is never billed twice for one activation.
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
                    'resumed' => true,
                ]);
            }

            // Providers can reject a reused reference. On failure, void the
            // stale attempt and fall through to create a fresh payment.
            try {
                $result = $this->paymentService->initiate($recentPending);

                return response()->json([
                    'payment' => $recentPending,
                    'redirect' => $result,
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

        // user_id is hardcoded to the authenticated user — it is never taken
        // from request input.
        $payment = Payment::create([
            'user_id' => $user->id,
            'amount' => $request->amount,
            'currency' => $request->currency ?? 'GHS',
            'method' => $request->method ?? 'mobile_money',
            'momo_number' => $request->momo_number,
            'status' => 'pending',
            'provider_reference' => strtoupper(Str::random(12)),
            'provider' => config('app.payment_provider', 'mock'),
        ]);

        try {
            $result = $this->paymentService->initiate($payment);
        } catch (\Throwable $e) {
            Log::error('Payment initiation failed', [
                'reference' => $payment->provider_reference,
                'provider' => $payment->provider,
                'error' => $e->getMessage(),
            ]);
            $payment->update(['status' => 'failed']);

            return response()->json([
                'message' => 'Payment provider is unavailable right now. Please try again shortly.',
            ], 502);
        }

        return response()->json([
            'payment' => $payment,
            'redirect' => $result,
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
                $payment->update(['status' => 'success']);
            }
        }

        return response()->json(['message' => 'Webhook received']);
    }
}
