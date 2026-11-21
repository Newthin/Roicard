<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\User;
use App\Services\Billing\PlanCatalog;
use App\Services\Billing\SubscriptionService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Admin controls for the plan catalogue and individual subscriptions.
 *
 * Prices are data, not code: an admin can adjust them without a deployment.
 * Existing subscriptions keep their dates; only future quotes are affected.
 */
class AdminBillingController extends Controller
{
    public function __construct(
        protected PlanCatalog $catalog,
        protected SubscriptionService $subscriptions
    ) {}

    public function plans(): JsonResponse
    {
        $plans = Plan::query()
            ->withCount('subscriptions')
            ->orderBy('sort_order')
            ->get()
            ->map(fn (Plan $plan) => $plan->toApiArray() + [
                'subscribers_count' => $plan->subscriptions_count ?? 0,
                'schedule' => $this->catalog->schedule($plan),
            ]);

        return response()->json(['plans' => $plans]);
    }

    public function updatePlan(string $code, Request $request): JsonResponse
    {
        $plan = Plan::where('code', $code)->firstOrFail();

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string', 'max:255'],
            'initial_price' => ['sometimes', 'numeric', 'min:0', 'max:100000'],
            'price' => ['sometimes', 'numeric', 'min:0', 'max:100000'],
            'interval' => ['sometimes', Rule::in(['none', 'month', 'year'])],
            'includes_card' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
            'is_public' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:1000'],
            'features' => ['sometimes', 'array'],
            'features.*' => ['nullable'],
        ]);

        // The plan code is an immutable identifier referenced by payments and
        // subscriptions, so it is deliberately not editable.
        $plan->fill($validated)->save();

        return response()->json([
            'plan' => $plan->fresh()->toApiArray(),
            'message' => 'Plan updated. Existing subscriptions keep their current period.',
        ]);
    }

    public function subscriptions(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['sometimes', 'string', Rule::in([
                Subscription::STATUS_FREE,
                Subscription::STATUS_ACTIVE,
                Subscription::STATUS_GRACE,
                Subscription::STATUS_EXPIRED,
                Subscription::STATUS_CANCELED,
                Subscription::STATUS_FOUNDING,
            ])],
            'plan' => ['sometimes', 'string', 'max:40'],
            'search' => ['sometimes', 'string', 'max:100'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $query = Subscription::query()
            ->with(['user:id,first_name,last_name,email,status', 'plan:id,code,name,interval,price'])
            ->latest();

        if (!empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        if (!empty($validated['plan'])) {
            $query->whereHas('plan', fn ($q) => $q->where('code', $validated['plan']));
        }

        if (!empty($validated['search'])) {
            $search = $validated['search'];
            $query->whereHas('user', function ($q) use ($search) {
                $q->where('email', 'like', "%{$search}%")
                    ->orWhere('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%");
            });
        }

        $subscriptions = $query->paginate($validated['per_page'] ?? 25);

        $subscriptions->getCollection()->transform(fn (Subscription $subscription) => [
            'id' => $subscription->id,
            'user' => $subscription->user?->only(['id', 'first_name', 'last_name', 'email', 'status']),
            'plan' => $subscription->plan?->only(['code', 'name', 'interval', 'price']),
            'status' => $subscription->status,
            'current_period_start' => $subscription->current_period_start?->toIso8601String(),
            'current_period_end' => $subscription->current_period_end?->toIso8601String(),
            'grace_ends_at' => $subscription->grace_ends_at?->toIso8601String(),
            'cancel_at_period_end' => (bool) $subscription->cancel_at_period_end,
            'days_remaining' => $subscription->daysRemaining(),
            'started_at' => $subscription->started_at?->toIso8601String(),
        ]);

        return response()->json($subscriptions);
    }

    /**
     * Grant/comp a plan to a member without a payment. Used for support
     * recovery, partner accounts and promotional grants.
     */
    public function grantSubscription(string $id, Request $request): JsonResponse
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'plan' => ['required', 'string', 'max:40'],
            'end_at' => ['nullable', 'date'],
            'send_welcome_email' => ['sometimes', 'boolean'],
        ]);

        $plan = Plan::where('code', $validated['plan'])->firstOrFail();

        $subscription = $this->subscriptions->grantPlan(
            $user,
            $plan->code,
            !empty($validated['end_at']) ? Carbon::parse($validated['end_at']) : null,
            (bool) ($validated['send_welcome_email'] ?? false),
            'admin_grant'
        );

        return response()->json([
            'subscription' => [
                'id' => $subscription->id,
                'plan' => $subscription->plan?->code,
                'status' => $subscription->status,
                'current_period_end' => $subscription->current_period_end?->toIso8601String(),
            ],
            'membership' => $this->subscriptions->summary($user->fresh()),
            'message' => 'Subscription granted',
        ]);
    }

    public function revokeSubscription(string $id): JsonResponse
    {
        $user = User::findOrFail($id);

        $this->subscriptions->revoke($user, 'admin_revoke');

        return response()->json([
            'membership' => $this->subscriptions->summary($user->fresh()),
            'message' => 'Subscription revoked',
        ]);
    }
}
