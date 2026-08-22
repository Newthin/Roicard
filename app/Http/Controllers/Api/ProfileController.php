<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ProfileRequest;
use App\Mail\WelcomeMemberMail;
use App\Models\Profile;
use App\Models\SocialLink;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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

        // Send the welcome email exactly once — the first successful profile
        // save after a user begins onboarding. Variant depends on whether they
        // already paid (active) or not (draft).
        if (!$user->onboarding_completed_at) {
            $user->forceFill(['onboarding_completed_at' => now()])->save();

            Mail::to($user)->queue(
                new WelcomeMemberMail($user, $user->status === 'active' ? 'member' : 'draft')
            );
        }

        $profile->load('education', 'experience', 'achievements', 'socialLinks', 'media');

        return response()->json([
            'profile' => $profile,
            'message' => 'Profile updated successfully',
            'user' => $user->only(['id', 'first_name', 'last_name', 'email', 'status', 'role']),
        ]);
    }
}
