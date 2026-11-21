<?php

namespace App\Services\Billing;

use App\Models\Plan;
use App\Models\Subscription;
use App\Models\User;

/**
 * Resolves what a member can use right now.
 *
 * Entitlements are derived from the current subscription, never stored on the
 * user row. An expired/cancelled subscription therefore falls back to the free
 * plan without a destructive data migration.
 */
class EntitlementService
{
    public function __construct(protected PlanCatalog $catalog) {}

    public function planFor(User $user): Plan
    {
        // Admin accounts are internal staff. They get full access without a
        // subscription row and must never inherit legacy founding rules.
        if ($user->isAdmin()) {
            return $this->catalog->find(Plan::STAFF);
        }

        $subscription = $user->subscription;

        if ($subscription && $subscription->isActive()) {
            return $subscription->plan ?? $this->catalog->find(
                $subscription->isFounding() ? Plan::FOUNDING : Plan::FREE
            );
        }

        // Legacy active members keep founding access until backfilled. Admins
        // are not members and must not inherit founding entitlements.
        if (!$subscription && $user->status === 'active' && !$user->isAdmin()) {
            return $this->catalog->find(Plan::FOUNDING);
        }

        return $this->catalog->find(Plan::FREE);
    }

    public function allows(User $user, string $feature): bool
    {
        $features = $this->planFor($user)->features ?? [];

        return (bool) ($features[$feature] ?? false);
    }

    /**
     * Resolve a numeric limit. `null` means unlimited; `0` means not allowed.
     */
    public function limit(User $user, string $key): ?int
    {
        $features = $this->planFor($user)->features ?? [];

        if (!array_key_exists($key, $features)) {
            return 0;
        }

        $value = $features[$key];

        return $value === null ? null : (int) $value;
    }

    /** @return array<string, mixed> */
    public function summary(User $user): array
    {
        $subscription = $user->subscription;
        $plan = $this->planFor($user);
        $features = $plan->features ?? [];
        $legacyFounding = !$subscription && $plan->code === Plan::FOUNDING;
        $virtualStaff = $user->isAdmin() && !$subscription;

        return [
            'plan' => $plan->code,
            'plan_name' => $plan->name,
            'status' => $virtualStaff
                ? Subscription::STATUS_ACTIVE
                : ($subscription?->status ?? ($legacyFounding ? Plan::FOUNDING : Plan::FREE)),
            'is_active' => $virtualStaff || ($subscription ? $subscription->isActive() : $legacyFounding),
            'is_founding' => $plan->code === Plan::FOUNDING,
            'is_internal' => $plan->isInternal(),
            'features' => $features,
            'limits' => [
                'cv_entries' => $this->limit($user, 'cv_entries'),
                'experience_entries' => $this->limit($user, 'experience_entries'),
            ],
        ];
    }
}
