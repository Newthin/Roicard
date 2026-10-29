<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * The only writer for membership + access state.
 *
 * Used by the payment activation job, the member's own deactivate/reactivate
 * endpoints and the admin console so all three paths apply the same side
 * effects (slug, is_live, cache busting, token revocation).
 */
class MemberAccountService
{
    public function __construct(protected SlugService $slugs) {}

    /** Mark membership as paid/active and publish the public profile. */
    public function activateMembership(User $user): void
    {
        DB::transaction(function () use ($user) {
            $profile = $user->profile()->firstOrCreate([]);

            if ($profile->slug === null) {
                $profile->slug = $this->slugs->generate($user->first_name, $user->last_name);
            }

            // ProfileObserver recalculates completion and busts the public cache.
            // A suspended account never publishes, even if an admin activates
            // the membership while access is still blocked.
            $profile->is_live = ! $user->isDeactivated();
            $profile->save();

            $user->forceFill(['status' => 'active'])->save();
        });
    }

    /**
     * Membership is no longer active. The account keeps dashboard access
     * (draft) but the public profile is hidden.
     */
    public function deactivateMembership(User $user): void
    {
        DB::transaction(function () use ($user) {
            $user->forceFill(['status' => 'draft'])->save();

            $profile = $user->profile()->firstOrCreate([]);
            $profile->is_live = false;
            $profile->save();
        });
    }

    /** Block sign-in and hide the public profile immediately. */
    public function suspend(User $user, bool $byAdmin = false): void
    {
        DB::transaction(function () use ($user, $byAdmin) {
            $user->forceFill([
                'deactivated_at' => now(),
                // Remember who initiated the block so only an admin can lift it.
                'suspended_by_admin' => $byAdmin,
            ])->save();

            $profile = $user->profile()->firstOrCreate([]);
            $profile->is_live = false;
            $profile->save();

            // Existing sessions must stop working right away.
            $user->tokens()->delete();
        });
    }

    /** Restore sign-in; publication follows the current membership status. */
    public function restore(User $user): void
    {
        DB::transaction(function () use ($user) {
            $user->forceFill([
                'deactivated_at' => null,
                'suspended_by_admin' => false,
            ])->save();

            $profile = $user->profile()->firstOrCreate([]);
            $profile->is_live = $user->status === 'active';
            $profile->save();
        });
    }

    /** Set (or clear) the onboarding-completed timestamp. */
    public function markOnboardingComplete(User $user, bool $complete = true): void
    {
        $user->forceFill([
            'onboarding_completed_at' => $complete
                ? ($user->onboarding_completed_at ?? now())
                : null,
        ])->save();
    }
}
