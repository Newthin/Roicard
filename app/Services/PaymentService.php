<?php

namespace App\Services;

use App\Models\Payment;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PaymentService
{
    public function initiate(Payment $payment): array
    {
        $provider = config('app.payment_provider', 'mock');

        return match ($provider) {
            'paystack' => $this->initiatePaystack($payment),
            'hubtel' => $this->initiateHubtel($payment),
            default => $this->initiateMock($payment),
        };
    }

    public function verify(string $reference): ?array
    {
        $provider = config('app.payment_provider', 'mock');

        return match ($provider) {
            'paystack' => $this->verifyPaystack($reference),
            'hubtel' => $this->verifyHubtel($reference),
            default => $this->verifyMock($reference),
        };
    }

    public function verifyWebhook(string $provider, array $payload, string $signature): bool
    {
        return match ($provider) {
            'paystack' => $this->verifyPaystackWebhook($payload, $signature),
            'hubtel' => $this->verifyHubtelWebhook($payload, $signature),
            default => true,
        };
    }

    protected function initiatePaystack(Payment $payment): array
    {
        $response = Http::withToken(config('services.paystack.secret_key'))
            ->post('https://api.paystack.co/transaction/initialize', [
                'email' => $payment->user->email,
                'amount' => (int) ($payment->amount * 100),
                'currency' => $payment->currency,
                'reference' => $payment->provider_reference,
                'callback_url' => config('app.frontend_url') . '/onboarding/callback',
            ]);

        $data = $response->throw()->json();

        return [
            'authorization_url' => $data['data']['authorization_url'],
            'reference' => $data['data']['reference'],
        ];
    }

    protected function verifyPaystack(string $reference): ?array
    {
        $response = Http::withToken(config('services.paystack.secret_key'))
            ->get("https://api.paystack.co/transaction/verify/{$reference}");

        $data = $response->throw()->json();

        return [
            'status' => $data['data']['status'] === 'success' ? 'success' : 'failed',
            'reference' => $reference,
        ];
    }

    protected function initiateHubtel(Payment $payment): array
    {
        $response = Http::withBasicAuth(
            config('services.hubtel.client_id'),
            config('services.hubtel.client_secret')
        )->post('https://api.hubtel.com/v1/merchantaccount/merchant/onlinecheckout', [
            'totalAmount' => $payment->amount,
            'description' => 'Roicard Smart Card Activation',
            'callbackUrl' => config('app.url') . '/api/payments/webhook/hubtel',
            'returnUrl' => config('app.url') . '/api/payments/callback',
            'merchantAccountNumber' => config('services.hubtel.merchant_number'),
            'channels' => ['MOMO'],
        ]);

        $data = $response->throw()->json();

        return [
            'checkout_url' => $data['data']['checkoutUrl'] ?? null,
            'reference' => $data['data']['checkoutId'] ?? $payment->provider_reference,
        ];
    }

    protected function verifyHubtel(string $reference): ?array
    {
        $response = Http::withBasicAuth(
            config('services.hubtel.client_id'),
            config('services.hubtel.client_secret')
        )->get("https://api.hubtel.com/v1/merchantaccount/merchant/onlinecheckout/status/{$reference}");

        $data = $response->throw()->json();

        return [
            'status' => match ($data['data']['status'] ?? '') {
                'Success' => 'success',
                'Failure' => 'failed',
                default => 'pending',
            },
            'reference' => $reference,
        ];
    }

    protected function verifyPaystackWebhook(array $payload, string $signature): bool
    {
        $computed = hash_hmac('sha512', json_encode($payload), config('services.paystack.secret_key'));
        return hash_equals($computed, $signature);
    }

    protected function verifyHubtelWebhook(array $payload, string $signature): bool
    {
        $computed = hash_hmac('sha256', json_encode($payload), config('services.hubtel.client_secret'));
        return hash_equals($computed, $signature);
    }

    protected function initiateMock(Payment $payment): array
    {
        return [
            'authorization_url' => null,
            'reference' => $payment->provider_reference,
            'mock' => true,
            'message' => 'Mock payment initiated. Use /api/payments/status/{ref} to confirm.',
        ];
    }

    protected function verifyMock(string $reference): ?array
    {
        $payment = Payment::where('provider_reference', $reference)->first();

        if (!$payment) {
            return null;
        }

        return [
            'status' => $payment->status,
            'reference' => $reference,
        ];
    }
}
