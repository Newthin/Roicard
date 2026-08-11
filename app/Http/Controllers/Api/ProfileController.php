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

        // Update user name fields if provided (email is not changed here —
        // the user is already authenticated with their existing email)
        $userFields = array_filter([
            'first_name' => $data['first_name'] ?? null,
            'last_name' => $data['last_name'] ?? null,
        ]);
        if ($userFields) {
            $user->update($userFields);
        }

        // Update profile (create if it doesn't exist yet)
        $profile = $user->profile()->firstOrCreate([]);
        // Decode interests JSON string into an array (empty array if invalid)
        $interests = null;
        if (!empty($data['interests'])) {
            $decoded = json_decode($data['interests'], true);
            $interests = is_array($decoded) ? array_values(array_filter($decoded, 'is_string')) : [];
        }

        // Sync interest options pivot table — create missing options so every
        // saved interest becomes a selectable option for other members too.
        if (is_array($interests)) {
            $interestOptionIds = [];
            foreach ($interests as $name) {
                $option = \App\Models\InterestOption::firstOrCreate(
                    ['name' => $name],
                    ['sort_order' => \App\Models\InterestOption::max('sort_order') + 1]
                );
                $interestOptionIds[] = $option->id;
            }
            $profile->interestOptions()->sync($interestOptionIds);
        }

        $profileFields = array_filter([
            'title' => $data['title'] ?? null,
            'role_description' => $data['role_description'] ?? null,
            'organisation' => $data['organisation'] ?? null,
            'whatsapp_phone' => $data['whatsapp_phone'] ?? null,
            'phone' => $data['phone'] ?? null,
            'date_of_birth' => $data['date_of_birth'] ?? null,
            'gender' => $data['gender'] ?? null,
            'interests' => $interests,
            'location' => $data['location'] ?? null,
            'bio' => $data['bio'] ?? null,
            'seeking' => $data['seeking'] ?? null,
            'offering' => $data['offering'] ?? null,
            'is_live' => $data['is_live'] ?? null,
        ], fn ($value) => $value !== null);
        if ($profileFields) {
            $profile->update($profileFields);
        }

        // Handle social links
        if (!empty($data['social_links'])) {
            $links = json_decode($data['social_links'], true);
            if (is_array($links)) {
                $profile->socialLinks()->delete();
                foreach ($links as $platform => $value) {
                    if (!empty($value)) {
                        $profile->socialLinks()->create([
                            'platform' => $platform,
                            'value' => $value,
                        ]);
                    }
                }
            }
        }

        $profile->recalculateCompletion();

        // Bust the public profile cache so changes are visible immediately
        $profile->bustPublicCache();

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
