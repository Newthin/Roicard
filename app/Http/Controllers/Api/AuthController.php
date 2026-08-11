<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Models\Connection;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = User::create([
            'first_name' => $request->first_name,
            'last_name' => $request->last_name,
            'email' => $request->email,
            'password' => $request->password,
            'status' => 'draft',
            'role' => 'member',
        ]);

        // Create empty profile
        $user->profile()->create([]);

        // Link any prior guest connection requests to this account
        Connection::linkGuestRequestsToUser($user);

        try {
            $user->sendEmailVerificationNotification();
        } catch (\Throwable $e) {
            Log::warning('Failed to send verification email', [
                'email' => $user->email,
                'error' => $e->getMessage(),
            ]);
        }

        return response()->json([
            'user' => $this->userPayload($user),
            'requires_email_verification' => true,
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        if ($user->isDeactivated()) {
            return response()->json([
                'message' => 'This account has been deactivated. Contact support to reactivate it.',
                'error' => 'account_deactivated',
            ], 403);
        }

        if (!$user->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Please verify your email before signing in. Check your inbox for the verification link.',
                'error' => 'email_not_verified',
            ], 403);
        }

        // Two-factor challenge: issue a short-lived pending token that can only
        // be exchanged for a full session at /auth/two-factor/verify.
        if ($user->two_factor_enabled) {
            $pendingToken = $user->createToken('two-factor-pending', ['two-factor'], now()->addMinutes(10));
            $user->tokens()->where('id', '!=', $pendingToken->accessToken->id)->delete();

            return response()->json([
                'user' => $this->userPayload($user),
                'two_factor_required' => true,
                'pending_token' => $pendingToken->plainTextToken,
            ]);
        }

        // Revoke every previously issued token so each fresh login invalidates
        // any old sessions (prevents a stale token from another account).
        $user->tokens()->delete();

        $token = $user->createToken('auth-token', ['*'], now()->addDays(30))->plainTextToken;

        return response()->json([
            'user' => $this->userPayload($user),
            'token' => $token,
        ]);
    }

    /** Completes a 2FA-gated login by verifying a TOTP code. */
    public function verifyTwoFactor(Request $request): JsonResponse
    {
        $request->validate([
            'code' => ['required', 'string', 'max:10'],
        ]);

        $user = $request->user();

        // Only a pending two-factor token may reach this step.
        if (!$request->user()->tokenCan('two-factor')) {
            return response()->json(['message' => 'Invalid two-factor session'], 403);
        }

        if (!$user->two_factor_enabled || !$user->two_factor_secret) {
            return response()->json(['message' => 'Two-factor authentication is not enabled'], 422);
        }

        if (!app(\App\Services\TwoFactorService::class)->verify($user->two_factor_secret, $request->code)) {
            return response()->json(['message' => 'Invalid verification code'], 422);
        }

        // Revoke the pending token and issue a full session.
        $user->tokens()->delete();
        $token = $user->createToken('auth-token', ['*'], now()->addDays(30))->plainTextToken;

        return response()->json([
            'user' => $this->userPayload($user),
            'token' => $token,
        ]);
    }

    /** Revokes the current access token. */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => 'Signed out successfully']);
    }

    /** Verifies the current password and updates it. */
    public function changePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password' => ['required', 'string'],
            'new_password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json(['message' => 'Current password is incorrect'], 422);
        }

        $user->password = $request->new_password;
        $user->save();

        // Invalidate every other session so the password change takes effect
        // everywhere except this device.
        $currentTokenId = $user->currentAccessToken()?->getKey();
        $user->tokens()->where('id', '!=', $currentTokenId)->delete();

        return response()->json(['message' => 'Password updated successfully']);
    }

    /** Updates account-level fields (email, public username). */
    public function updateAccount(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['sometimes', 'email', 'max:255', Rule::unique('users', 'email')->ignore($request->user()->id)],
            'username' => ['sometimes', 'string', 'max:60', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique('profiles', 'slug')->ignore($request->user()->profile?->id)],
        ]);

        $user = $request->user();
        $profile = $user->profile()->firstOrCreate([]);

        $emailChanged = false;
        if ($request->filled('email') && $request->email !== $user->email) {
            $user->email = $request->email;
            // A new email must be verified before it can be used to sign in.
            $user->email_verified_at = null;
            $user->save();
            $emailChanged = true;

            try {
                $user->sendEmailVerificationNotification();
            } catch (\Throwable $e) {
                Log::warning('Failed to send verification email after account update', [
                    'email' => $user->email,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $slugChanged = false;
        if ($request->filled('username') && $request->username !== $profile->slug) {
            $profile->slug = $request->username;
            $profile->save();
            $slugChanged = true;
            $profile->bustPublicCache();
        }

        $user->refresh();

        return response()->json([
            'user' => $this->userPayload($user),
            'profile' => ['slug' => $profile->slug],
            'email_changed' => $emailChanged,
            'requires_email_verification' => $emailChanged,
            'message' => $emailChanged
                ? 'Account updated. Check your inbox to verify your new email.'
                : 'Account updated successfully',
        ]);
    }

    /** Returns the current two-factor status (never the raw secret). */
    public function twoFactorStatus(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'enabled' => (bool) $user->two_factor_enabled,
            'has_pending_secret' => !$user->two_factor_enabled && $user->two_factor_secret !== null,
        ]);
    }

    /** Begins two-factor setup: generates a secret + otpauth provisioning URI. */
    public function twoFactorSetup(Request $request): JsonResponse
    {
        $request->validate([
            'current_password' => ['required', 'string'],
        ]);

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json(['message' => 'Current password is incorrect'], 422);
        }

        $service = app(\App\Services\TwoFactorService::class);
        $secret = $user->two_factor_secret ?? $service->generateSecret();

        if (!$user->two_factor_secret) {
            $user->two_factor_secret = $secret;
            $user->save();
        }

        $account = $user->email ?: "{$user->first_name} {$user->last_name}";

        return response()->json([
            'secret' => $secret,
            'otpauth_url' => $service->provisioningUri($secret, $account),
        ]);
    }

    /** Confirms setup by verifying a TOTP code against the pending secret. */
    public function twoFactorConfirm(Request $request): JsonResponse
    {
        $request->validate([
            'code' => ['required', 'string', 'max:10'],
        ]);

        $user = $request->user();

        if ($user->two_factor_enabled) {
            return response()->json(['message' => 'Two-factor authentication is already enabled'], 422);
        }

        if (!$user->two_factor_secret) {
            return response()->json(['message' => 'Start two-factor setup first'], 422);
        }

        if (!app(\App\Services\TwoFactorService::class)->verify($user->two_factor_secret, $request->code)) {
            return response()->json(['message' => 'Invalid verification code'], 422);
        }

        $user->two_factor_enabled = true;
        $user->save();

        return response()->json([
            'message' => 'Two-factor authentication enabled',
            'enabled' => true,
        ]);
    }

    /** Disables two-factor authentication after verifying a code or password. */
    public function twoFactorDisable(Request $request): JsonResponse
    {
        $request->validate([
            'code' => ['sometimes', 'required', 'string', 'max:10'],
            'current_password' => ['sometimes', 'required', 'string'],
        ]);

        $user = $request->user();

        if (!$user->two_factor_enabled) {
            return response()->json(['message' => 'Two-factor authentication is not enabled'], 422);
        }

        $valid = false;
        if ($request->filled('code')) {
            $valid = $user->two_factor_secret
                && app(\App\Services\TwoFactorService::class)->verify($user->two_factor_secret, $request->code);
        }
        if (!$valid && $request->filled('current_password')) {
            $valid = Hash::check($request->current_password, $user->password);
        }

        if (!$valid) {
            return response()->json(['message' => 'Invalid verification code or password'], 422);
        }

        $user->two_factor_enabled = false;
        $user->two_factor_secret = null;
        $user->save();

        return response()->json([
            'message' => 'Two-factor authentication disabled',
            'enabled' => false,
        ]);
    }

    /** Marks the account deactivated and hides the public profile. */
    public function deactivate(Request $request): JsonResponse
    {
        $request->validate([
            'current_password' => ['required', 'string'],
        ]);

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json(['message' => 'Current password is incorrect'], 422);
        }

        $user->deactivated_at = now();
        $user->save();

        $user->profile?->update(['is_live' => false]);
        $user->profile?->bustPublicCache();

        // Revoke all sessions so the user must sign back in to reactivate.
        $user->tokens()->delete();

        return response()->json(['message' => 'Account deactivated']);
    }

    /** Reactivates a deactivated account after password verification. */
    public function reactivate(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
            'current_password' => ['required', 'string'],
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->current_password, $user->password)) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        if (!$user->isDeactivated()) {
            return response()->json(['message' => 'Account is not deactivated'], 422);
        }

        $user->deactivated_at = null;
        $user->save();

        return response()->json(['message' => 'Account reactivated. You can now sign in.']);
    }

    /** Permanently deletes the account and all cascade-owned data. */
    public function deleteAccount(Request $request): JsonResponse
    {
        $request->validate([
            'current_password' => ['required', 'string'],
        ]);

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json(['message' => 'Current password is incorrect'], 422);
        }

        $user->profile?->bustPublicCache();

        // Payments, analytics, connections (member_id) and the profile all
        // cascade on delete. Revoke tokens first so nothing survives.
        $user->tokens()->delete();
        $user->delete();

        return response()->json(['message' => 'Account permanently deleted']);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        $storedUserId = $request->header('X-Roicard-User-Id');
        $storedEmail = $request->header('X-Roicard-User-Email');

        // Identity-mismatch guard: the token resolves to a user, but the browser
        // cached a different identity. Answer 409 so the client purges its state.
        $mismatch = ($storedUserId !== null && (string) $storedUserId !== (string) $user->getKey())
            || ($storedEmail !== null && strtolower($storedEmail) !== strtolower($user->email));

        if ($mismatch) {
            return response()->json([
                'message' => 'Session identity does not match this account — please sign in again.',
                'error' => 'identity_mismatch',
            ], 409);
        }

        return response()->json(['user' => $this->userPayload($user)]);
    }

    public function verifyEmail(Request $request, string $id, string $hash)
    {
        $frontendUrl = rtrim(config('app.frontend_url', 'http://localhost:3000'), '/');

        if (!$request->hasValidSignature()) {
            return redirect($frontendUrl . '/auth/verify-email?verified=invalid');
        }

        $user = User::find($id);

        if (!$user || !hash_equals(sha1($user->getEmailForVerification()), (string) $hash)) {
            return redirect($frontendUrl . '/auth/verify-email?verified=invalid');
        }

        if (!$user->hasVerifiedEmail() && $user->markEmailAsVerified()) {
            event(new Verified($user));
        }

        return redirect($frontendUrl . '/auth/verify-email?verified=true');
    }

    public function resendVerification(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email']]);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json(['message' => 'If that email is registered, a verification link has been sent.']);
        }

        if ($user->hasVerifiedEmail()) {
            return response()->json(['message' => 'Email already verified']);
        }

        try {
            $user->sendEmailVerificationNotification();
        } catch (\Throwable $e) {
            Log::warning('Failed to resend verification email', [
                'email' => $user->email,
                'error' => $e->getMessage(),
            ]);

            return response()->json(['message' => 'Unable to send verification email right now'], 500);
        }

        return response()->json(['message' => 'Verification email sent']);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email']]);

        $status = Password::sendResetLink($request->only('email'));

        return $status === Password::RESET_LINK_SENT
            ? response()->json(['message' => 'Reset link sent to your email'])
            : response()->json(['message' => 'Unable to send reset link'], 400);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'token' => ['required'],
            'email' => ['required', 'email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user, $password) {
                $user->forceFill([
                    'password' => $password,
                ])->setRememberToken(Str::random(60));

                $user->save();

                event(new PasswordReset($user));
            }
        );

        return $status === Password::PASSWORD_RESET
            ? response()->json(['message' => 'Password reset successfully'])
            : response()->json(['message' => 'Invalid token'], 400);
    }

    protected function userPayload(User $user): array
    {
        return $user->only(['id', 'first_name', 'last_name', 'email', 'status', 'role'])
            + ['email_verified' => (bool) $user->hasVerifiedEmail()];
    }
}
