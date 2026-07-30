<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ProfileRequest;
use App\Models\Profile;
use App\Models\SocialLink;
use Illuminate\Http\JsonResponse;

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

        return response()->json([
            'profile' => $profile->load('media'),
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

    public function update(ProfileRequest $request): JsonResponse
    {
        $user = auth()->user();
        $data = $request->validated();

        // Update user fields if provided
        $userFields = array_filter([
            'first_name' => $data['first_name'] ?? null,
            'last_name' => $data['last_name'] ?? null,
            'email' => $data['email'] ?? null,
        ]);
        if ($userFields) {
            $user->update($userFields);
        }

        // Update profile
        $profile = $user->profile()->firstOrFail();
        $profileFields = array_filter([
            'title' => $data['title'] ?? null,
            'organisation' => $data['organisation'] ?? null,
            'whatsapp_phone' => $data['whatsapp_phone'] ?? null,
            'location' => $data['location'] ?? null,
            'bio' => $data['bio'] ?? null,
            'is_live' => $data['is_live'] ?? null,
        ]);
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

        $profile->load('education', 'experience', 'achievements', 'socialLinks', 'media');

        return response()->json([
            'profile' => $profile,
            'message' => 'Profile updated successfully',
            'user' => $user->only(['id', 'first_name', 'last_name', 'email', 'status', 'role']),
        ]);
    }
}
