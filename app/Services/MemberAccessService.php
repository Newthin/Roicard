<?php

namespace App\Services;

use App\Models\User;

/**
 * Single source of truth for "where should this member go next?".
 *
 * The client must never decide dashboard access from localStorage. Every
 * login/`me`/profile response carries the resolved `next_step`, derived from
 * the server-side state columns:
 *
 *   deactivated_at           -> blocked (account access)
 *   role = admin             -> admin console
 *   onboarding_completed_at is null -> onboarding journey
 *   otherwise                -> dashboard
 *
 * Payment does not gate the dashboard in this product: draft members can use
 * the dashboard (with a pay card) while their public profile stays private.
 */
class MemberAccessService
{
    public const NEXT_DASHBOARD = 'dashboard';
    public const NEXT_ONBOARDING = 'onboarding';
    public const NEXT_ADMIN = 'admin';
    public const NEXT_BLOCKED = 'blocked';

    public function nextStep(User $user): string
    {
        if ($user->isDeactivated()) {
            return self::NEXT_BLOCKED;
        }

        if ($user->isAdmin()) {
            return self::NEXT_ADMIN;
        }

        if ($user->onboarding_completed_at === null) {
            return self::NEXT_ONBOARDING;
        }

        return self::NEXT_DASHBOARD;
    }

    /** Public profile completion percentage (informational, never an access gate). */
    public function completionPercent(User $user): int
    {
        return (int) ($user->profile?->completion_pct ?? 0);
    }

    /**
     * The canonical user payload shared by login, register, /me, OAuth and the
     * profile endpoints. Keeping this in one place stops the flags from drifting.
     */
    public function payload(User $user): array
    {
        return $user->only(['id', 'first_name', 'last_name', 'email', 'status', 'role'])
            + [
                'email_verified' => (bool) $user->hasVerifiedEmail(),
                'onboarding_completed' => $user->onboarding_completed_at !== null,
                'next_step' => $this->nextStep($user),
                'is_deactivated' => $user->isDeactivated(),
                'profile_completion_pct' => $this->completionPercent($user),
                'campaign_code' => $user->campaign_code,
                'activation_fee' => app(ActivationFeeService::class)->for($user),
                'draft_closes_at' => $user->draftClosesAt()?->toISOString(),
            ];
    }
}
