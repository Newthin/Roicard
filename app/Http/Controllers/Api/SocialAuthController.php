<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Connection;
use App\Models\SocialAccount;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Spatie\Permission\Models\Role;

class SocialAuthController extends Controller
{
/**
     * Allowed OAuth providers mapped to their Socialite driver name.
     */
    protected const PROVIDERS = [
        'google' => 'google',
        'facebook' => 'facebook',
        'linkedin' => 'linkedin-openid',
        'x' => 'x',
        'instagram' => 'instagram',
    ];

    /**
     * Redirect the user to the provider's OAuth consent screen.
     */
    public function redirect(string $provider)
    {
        if (!isset(self::PROVIDERS[$provider])) {
            return $this->frontendRedirect(['error' => 'unsupported_provider']);
        }

        try {
            return Socialite::driver(self::PROVIDERS[$provider])->stateless()->redirect();
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error("Social redirect failed [{$provider}]", [
                'message' => $e->getMessage(),
                'class' => get_class($e),
            ]);
            return $this->frontendRedirect(['error' => 'provider_not_configured']);
        }
    }

    /**
     * Handle the provider callback, find-or-create the user by email, and hand
     * the browser back to the frontend with a Sanctum token.
     */
    public function callback(string $provider, Request $request)
    {
        if (!isset(self::PROVIDERS[$provider])) {
            return $this->frontendRedirect(['error' => 'unsupported_provider']);
        }

        try {
            $socialUser = Socialite::driver(self::PROVIDERS[$provider])->stateless()->user();
        } catch (\Throwable $e) {
            Log::error("Social auth failed [{$provider}]", [
                'message' => $e->getMessage(),
                'class' => get_class($e),
                'query' => $request->query(),
            ]);
            return $this->frontendRedirect(['error' => 'social_auth_failed']);
        }

        $email = $socialUser->getEmail();
        $providerId = $socialUser->getId();

        try {
            $user = DB::transaction(function () use ($socialUser, $provider, $email, $providerId) {
                // 1) Try to attach to an existing social account.
                $socialAccount = SocialAccount::where('provider', $provider)
                    ->where('provider_id', $providerId)
                    ->with('user')
                    ->first();

                // `user` is null when the account was soft-deleted. The stale
                // identity must not crash the callback; drop it and rebuild
                // from the provider data below.
                if ($socialAccount && $socialAccount->user) {
                    return $socialAccount->user;
                }

                if ($socialAccount) {
                    $socialAccount->delete();
                }

                // 2) Match an existing user by email, otherwise create one.
                $fallbackEmail = Str::lower($provider) . '_' . $providerId . '@roicard.local';
                $lookupEmail = $email ?: $fallbackEmail;

                $user = User::where('email', $lookupEmail)->first();

                // A soft-deleted account still occupies the email address. Do
                // not attempt an insert that would violate the unique index.
                if (!$user && User::withTrashed()->where('email', $lookupEmail)->exists()) {
                    return null;
                }

                if (!$user) {
                    $name = $socialUser->getName() ?? $socialUser->getNickname() ?? $lookupEmail;
                    $nameParts = array_values(array_filter(explode(' ', trim($name))));
                    $firstName = $nameParts[0] ?? $lookupEmail;
                    $lastName = count($nameParts) > 1 ? implode(' ', array_slice($nameParts, 1)) : '';

                    $user = User::create([
                        'first_name' => $firstName,
                        'last_name' => $lastName,
                        'email' => $lookupEmail,
                        'password' => Hash::make(Str::random(32)),
                        'status' => 'draft',
                        'role' => 'member',
                        'email_verified_at' => now(),
                    ]);

                    $user->profile()->create([]);

                    // The `role` column is the routing source of truth. The
                    // Spatie role is secondary, so a deployment that has not
                    // run the role seeder must not turn OAuth signup into a
                    // 500 (`RoleDoesNotExist`).
                    if (Role::where('name', 'member')->where('guard_name', 'web')->exists()) {
                        $user->assignRole('member');
                    }

                    // Link any prior guest connection requests to this account
                    Connection::linkGuestRequestsToUser($user);
                } elseif (!$user->hasVerifiedEmail() && $email) {
                    // Provider already verified this email, mark it as such.
                    $user->markEmailAsVerified();
                }

                // 3) Persist the social identity.
                SocialAccount::updateOrCreate(
                    ['provider' => $provider, 'provider_id' => $providerId],
                    [
                        'user_id' => $user->id,
                        'email' => $email,
                        'avatar_url' => $socialUser->getAvatar(),
                    ]
                );

                return $user;
            });
        } catch (\Throwable $e) {
            // Never leak a generic "Server Error" to the browser after the
            // provider has already authenticated the person. Log the real
            // cause (DB, media, mail, etc.) and return a usable error state.
            Log::error("Social signup failed [{$provider}]", [
                'message' => $e->getMessage(),
                'class' => get_class($e),
                'email' => $email,
            ]);

            return $this->frontendRedirect(['error' => 'social_signup_failed']);
        }

        if ($user === null) {
            // This email belongs to a deleted account; it cannot be reused.
            return $this->frontendRedirect(['error' => 'account_deleted']);
        }

        // Revoke any previously issued tokens so old sessions can't linger.
        $user->tokens()->delete();

        // Suspended accounts must not obtain a session through OAuth either.
        if ($user->isDeactivated()) {
            return $this->frontendRedirect(['error' => 'account_deactivated']);
        }

        $token = $user->createToken('auth-token', ['*'], now()->addDays(30))->plainTextToken;

        return $this->frontendRedirect([
            'token' => $token,
            'user' => json_encode(app(\App\Services\MemberAccessService::class)->payload($user)),
        ]);
    }

    protected function frontendRedirect(array $params)
    {
        $frontendUrl = config('app.frontend_url', 'http://localhost:3000');
        $query = http_build_query($params);

        return redirect($frontendUrl . '/auth/social/callback?' . $query);
    }
}