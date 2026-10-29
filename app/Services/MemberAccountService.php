<?php

namespace App\Services;

use App\Mail\WelcomeMemberMail;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

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
    public function activateMembership(User $user, bool $sendWelcome = true): void
    {
        DB::transaction(function () use ($user, $sendWelcome) {
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

            // An active membership always clears onboarding: a member who has
            // paid (or been activated by an admin) must never be bounced back
            // into the journey. The welcome email is only sent on the first
            // completion, so this can be called repeatedly without duplicating.
            $this->markOnboardingComplete($user, true, $sendWelcome);
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

    /**
     * The single writer for "onboarding finished".
     *
     * Returns true only when the state actually changed, which is what keeps
     * the welcome email once-only across the member flow, the payment
     * activation path and the admin console.
     *
     * @param  bool  $sendWelcome  Only used on the first null -> complete
     *                             transition. Member flows pass true; admin
     *                             flows pass their explicit flag.
     */
    public function markOnboardingComplete(User $user, bool $complete = true, bool $sendWelcome = false): bool
    {
        $user->refresh();

        $wasComplete = $user->onboarding_completed_at !== null;

        if ($complete === $wasComplete) {
            return false;
        }

        $user->forceFill([
            'onboarding_completed_at' => $complete ? now() : null,
        ])->save();

        if ($complete && $sendWelcome) {
            $this->sendWelcomeEmail($user);
        }

        return true;
    }

    /** Welcome email variant matches the membership state at completion time. */
    protected function sendWelcomeEmail(User $user): void
    {
        try {
            Mail::to($user)->queue(
                new WelcomeMemberMail($user, $user->status === 'active' ? 'member' : 'draft')
            );
        } catch (\Throwable $e) {
            Log::warning('Failed to queue welcome email', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
