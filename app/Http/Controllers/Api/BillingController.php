<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\Plan;
use App\Services\Billing\PlanCatalog;
use App\Services\Billing\SubscriptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BillingController extends Controller
{
    public function __construct(
        protected PlanCatalog $catalog,
        protected SubscriptionService $subscriptions
    ) {}

    /**
     * Billing overview for the settings screen: current plan, lifecycle dates,
     * upgrade/renewal quotes and recent invoices.
     */
    public function summary(Request $request): JsonResponse
    {
        $user = $request->user();

        $quotes = $this->catalog->publicPlans()->mapWithKeys(function ($plan) use ($user) {
            $quote = $this->catalog->quote($user, $plan->code);
            unset($quote['plan']);

            return [$plan->code => $quote];
        });

        return response()->json([
            'membership' => $this->subscriptions->summary($user),
            'quotes' => $quotes,
            'invoices' => $this->invoicePayload($user, 10),
            'payment_methods' => [
                ['value' => 'mobile_money', 'label' => 'Mobile Money'],
                ['value' => 'card', 'label' => 'Card'],
            ],
        ]);
    }

    /** Paginated payment history. */
    public function invoices(Request $request): JsonResponse
    {
        $perPage = min(50, max(1, (int) $request->query('per_page', 20)));

        $payments = $request->user()->payments()
            ->with('plan')
            ->latest()
            ->paginate($perPage);

        $payments->getCollection()->transform(fn (Payment $payment) => $this->invoice($payment));

        return response()->json($payments);
    }

    /** Server-side quote for a plan (no charge). */
    public function quote(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'plan' => ['required', 'string', 'max:40'],
        ]);

        $quote = $this->catalog->quote($request->user(), $validated['plan']);

        if (!empty($quote['blocked_reason'])) {
            return response()->json([
                'message' => $quote['blocked_reason'],
                'error' => $quote['blocked_code'],
                'quote' => $this->withoutPlan($quote),
            ], 422);
        }

        return response()->json(['quote' => $this->withoutPlan($quote)]);
    }

    /** Cancel at period end; access continues until the paid period ends. */
    public function cancel(Request $request): JsonResponse
    {
        $subscription = $this->subscriptions->cancel($request->user());

        return response()->json([
            'message' => 'Your plan will not renew. Access continues until '
                . optional($subscription->current_period_end)->toFormattedDateString() . '.',
            'membership' => $this->subscriptions->summary($request->user()->fresh()),
        ]);
    }

    /** Undo a pending cancellation. */
    public function resume(Request $request): JsonResponse
    {
        $this->subscriptions->resume($request->user());

        return response()->json([
            'message' => 'Your plan will renew as scheduled.',
            'membership' => $this->subscriptions->summary($request->user()->fresh()),
        ]);
    }

    /** @return array<int, array<string, mixed>> */
    protected function invoicePayload($user, int $limit): array
    {
        return $user->payments()
            ->with('plan')
            ->latest()
            ->limit($limit)
            ->get()
            ->map(fn (Payment $payment) => $this->invoice($payment))
            ->all();
    }

    /** @return array<string, mixed> */
    protected function invoice(Payment $payment): array
    {
        return [
            'id' => $payment->id,
            'reference' => $payment->provider_reference,
            'plan' => $payment->plan?->code,
            'plan_name' => $payment->plan?->name,
            'purpose' => $payment->purpose,
            'amount' => (float) $payment->amount,
            'currency' => $payment->currency,
            'method' => $payment->method,
            'status' => $payment->status,
            'period_start' => $payment->period_start?->toIso8601String(),
            'period_end' => $payment->period_end?->toIso8601String(),
            'paid_at' => $payment->status === 'success' ? $payment->updated_at?->toIso8601String() : null,
            'created_at' => $payment->created_at?->toIso8601String(),
        ];
    }

    /** @param array<string, mixed> $quote */
    protected function withoutPlan(array $quote): array
    {
        unset($quote['plan']);

        return $quote;
    }
}
