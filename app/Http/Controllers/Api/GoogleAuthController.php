<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Connection;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Spatie\Permission\Models\Role;

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

        try {
            $user = DB::transaction(function () use ($googleUser) {
                $user = User::where('email', $googleUser->getEmail())->first();

                if (!$user) {
                    // A soft-deleted account still occupies the email address.
                    // Do not attempt an insert that would violate the unique
                    // index; surface the same `account_deleted` state as the
                    // social controller.
                    if (User::withTrashed()->where('email', $googleUser->getEmail())->exists()) {
                        return null;
                    }

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

                    // The `role` column is the routing source of truth. The
                    // Spatie role is secondary, so a deployment that has not
                    // run the role seeder must not turn OAuth signup into a
                    // 500 (`RoleDoesNotExist`).
                    if (Role::where('name', 'member')->where('guard_name', 'web')->exists()) {
                        $user->assignRole('member');
                    }

                    // Link any prior guest connection requests to this account
                    Connection::linkGuestRequestsToUser($user);
                } else {
                    $user->google_id = $googleUser->getId();
                    if (!$user->hasVerifiedEmail()) {
                        $user->markEmailAsVerified();
                    }
                    $user->save();
                }

                return $user;
            });
        } catch (\Throwable $e) {
            // Never leak a generic "Server Error" to the browser after Google
            // has already authenticated the person. Log the real cause (DB,
            // media, mail, etc.) and send them back with a usable error state.
            Log::error('Google signup failed', [
                'message' => $e->getMessage(),
                'class' => get_class($e),
                'email' => $googleUser->getEmail(),
            ]);

            return $this->frontendRedirect(['error' => 'google_signup_failed']);
        }

        if ($user === null) {
            // This email belongs to a deleted account; it cannot be reused
            // until it is restored or permanently purged.
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

        return redirect($frontendUrl . '/auth/google/callback?' . $query);
    }
}
