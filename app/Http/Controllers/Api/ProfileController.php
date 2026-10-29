<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ProfileRequest;
use App\Mail\WelcomeMemberMail;
use App\Models\Profile;
use App\Models\SocialLink;
use App\Services\MemberAccessService;
use App\Services\MemberAccountService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class ProfileController extends Controller
{
    public function show(): JsonResponse
    {
        $profile = auth()->user()->profile()->with([
            'education',
            'experience',
            'achievements',
            'socialLinks',
        ])->firstOrFail();

        $profile->load('user', 'media');

        return response()->json([
            'profile' => $profile,
        ]);
    }

    public function store(ProfileRequest $request): JsonResponse
    {
        $profile = auth()->user()->profile()->firstOrCreate([]);
        $profile->update($request->validated());

        return response()->json([
            'profile' => $profile->fresh(),
            'message' => 'Profile created successfully',
        ]);
    }

    public function uploadAvatar(Request $request): JsonResponse
    {
        $request->validate([
            'avatar' => ['required', 'image', 'mimes:jpeg,png,jpg,gif,webp', 'max:5120'],
        ]);

        $file = $request->file('avatar');
        $userId = auth()->id();
        $ext = $file->extension();
        $filename = "avatar.{$ext}";

        $profile = auth()->user()->profile()->firstOrFail();
        $profile->addMedia($file)
            ->usingFileName($filename)
            ->toMediaCollection('avatar');

        // Media writes don't save the profile row, so the observer doesn't
        // fire — bust the public cache here so the new avatar appears
        // immediately on the public profile.
        $profile->bustPublicCache();

        $url = $profile->getFirstMediaUrl('avatar');
        $versionedUrl = $url . '?v=' . now()->timestamp;

        return response()->json([
            'url' => $versionedUrl,
        ]);
    }

    public function update(ProfileRequest $request): JsonResponse
    {
        $user = auth()->user();
        $data = $request->validated();

        $profile = app(\App\Services\ProfileSaveService::class)->save($user, $data);

        // Kept for backwards compatibility with older clients that finish the
        // journey by saving the profile: the first successful save marks
        // onboarding complete. New clients call POST /profile/complete.
        if ($user->onboarding_completed_at === null) {
            app(MemberAccountService::class)->markOnboardingComplete($user);

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

        $profile->load('education', 'experience', 'achievements', 'socialLinks', 'media');
        $user->refresh();

        return response()->json([
            'profile' => $profile,
            'message' => 'Profile updated successfully',
            'user' => app(MemberAccessService::class)->payload($user),
        ]);
    }

    /**
     * Explicitly finishes the onboarding journey.
     *
     * The client must not decide completion locally: marking this on the
     * server is what lets `next_step` flip to `dashboard`, so a completed
     * member is never bounced back into onboarding.
     */
    public function complete(): JsonResponse
    {
        $user = auth()->user();
        $profile = $user->profile()->firstOrCreate([]);
        $profile->recalculateCompletion();

        $wasComplete = $user->onboarding_completed_at !== null;

        app(MemberAccountService::class)->markOnboardingComplete($user);
        $user->refresh();

        // Send the welcome email exactly once, matching the legacy save flow.
        if (!$wasComplete) {
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

        return response()->json([
            'message' => 'Onboarding complete',
            'profile' => $profile->fresh(),
            'user' => app(MemberAccessService::class)->payload($user),
        ]);
    }
}
