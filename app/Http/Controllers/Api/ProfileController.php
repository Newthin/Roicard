<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ProfileRequest;
use App\Models\Profile;
use App\Models\SocialLink;
use App\Services\MemberAccessService;
use App\Services\MemberAccountService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
        // journey by saving the profile. Completion + the once-only welcome
        // email live in MemberAccountService, so every completion path (member,
        // payment, admin) stays consistent.
        app(MemberAccountService::class)->markOnboardingComplete($user, true, true);

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

        // Sends the welcome email only on the first completion, with the
        // correct member/draft variant for the current membership state.
        app(MemberAccountService::class)->markOnboardingComplete($user, true, true);
        $user->refresh();

        return response()->json([
            'message' => 'Onboarding complete',
            'profile' => $profile->fresh(),
            'user' => app(MemberAccessService::class)->payload($user),
        ]);
    }
}
