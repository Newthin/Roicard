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
        // last hour (retry storm / double-tap protection).
        $recentPending = Payment::where('user_id', $user->id)
            ->where('status', 'pending')
            ->where('created_at', '>=', now()->subHour())
            ->exists();

        if ($recentPending) {
            return response()->json([
                'message' => 'A pending payment already exists for this account',
            ], 409);
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

        $result = $this->paymentService->initiate($payment);

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
            $verified = $this->paymentService->verify($reference);

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
