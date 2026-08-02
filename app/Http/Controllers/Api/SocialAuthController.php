<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SocialAccount;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

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
            return $this->frontendRedirect(['error' => 'social_auth_failed']);
        }

        $email = $socialUser->getEmail();
        $providerId = $socialUser->getId();

        // 1) Try to attach to an existing social account.
        $socialAccount = SocialAccount::where('provider', $provider)
            ->where('provider_id', $providerId)
            ->with('user')
            ->first();

        if ($socialAccount) {
            $user = $socialAccount->user;
        } else {
            // 2) Match an existing user by email, otherwise create one.
            $user = $email ? User::where('email', $email)->first() : null;

            if (!$user) {
                $name = $socialUser->getName() ?? $socialUser->getNickname() ?? $email ?? $providerId;
                $nameParts = array_values(array_filter(explode(' ', trim($name))));
                $firstName = $nameParts[0] ?? ($email ?: 'User');
                $lastName = count($nameParts) > 1 ? implode(' ', array_slice($nameParts, 1)) : '';

                $user = User::create([
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                    'email' => $email ?: (Str::lower($provider) . '_' . $providerId . '@roicard.local'),
                    'password' => Hash::make(Str::random(32)),
                    'status' => 'draft',
                    'role' => 'member',
                ]);

                $user->profile()->create([]);
                $user->assignRole('member');
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
        }

        $token = $user->createToken('auth-token')->plainTextToken;

        return $this->frontendRedirect([
            'token' => $token,
            'user' => json_encode($user->only(['id', 'first_name', 'last_name', 'email', 'status', 'role'])),
        ]);
    }

    protected function frontendRedirect(array $params)
    {
        $frontendUrl = config('app.frontend_url', 'http://localhost:3000');
        $query = http_build_query($params);

        return redirect($frontendUrl . '/auth/social/callback?' . $query);
    }
}