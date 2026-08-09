<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Connection;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class GoogleAuthController extends Controller
{
    /**
     * Redirect the user to Google's OAuth consent screen.
     * The frontend sends the browser here; Google then bounces back to callback().
     */
    public function redirect(): \Symfony\Component\HttpFoundation\RedirectResponse
    {
        return Socialite::driver('google')->stateless()->redirect();
    }

    /**
     * Handle Google's callback, find or create the user, and hand the browser
     * back to the frontend with a Sanctum token.
     */
    public function callback(Request $request)
    {
        try {
            $googleUser = Socialite::driver('google')->stateless()->user();
        } catch (\Throwable $e) {
            return $this->frontendRedirect(['error' => 'google_auth_failed']);
        }

        $user = User::where('email', $googleUser->getEmail())->first();

        if (!$user) {
            $name = $googleUser->getName() ?? $googleUser->getNickname() ?? '';
            $nameParts = array_values(array_filter(explode(' ', trim($name))));
            $firstName = $nameParts[0] ?? $googleUser->getEmail();
            $lastName = count($nameParts) > 1 ? implode(' ', array_slice($nameParts, 1)) : '';

            $user = User::create([
                'first_name' => $firstName,
                'last_name' => $lastName,
                'email' => $googleUser->getEmail(),
                'password' => Hash::make(Str::random(32)),
                'status' => 'draft',
                'role' => 'member',
                'google_id' => $googleUser->getId(),
                'email_verified_at' => now(),
            ]);

            $user->profile()->create([]);
            $user->assignRole('member');

            // Link any prior guest connection requests to this account
            Connection::linkGuestRequestsToUser($user);
        } else {
            $user->google_id = $googleUser->getId();
            if (!$user->hasVerifiedEmail()) {
                $user->markEmailAsVerified();
            }
            $user->save();
        }

        // Revoke any previously issued tokens so old sessions can't linger.
        $user->tokens()->delete();

        $token = $user->createToken('auth-token', ['*'], now()->addDays(30))->plainTextToken;

        return $this->frontendRedirect([
            'token' => $token,
            'user' => json_encode(
                $user->only(['id', 'first_name', 'last_name', 'email', 'status', 'role'])
                + ['email_verified' => (bool) $user->hasVerifiedEmail()]
            ),
        ]);
    }

    protected function frontendRedirect(array $params)
    {
        $frontendUrl = config('app.frontend_url', 'http://localhost:3000');
        $query = http_build_query($params);

        return redirect($frontendUrl . '/auth/google/callback?' . $query);
    }
}
