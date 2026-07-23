<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ProfileRequest;
use App\Models\Profile;
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
        $profile = auth()->user()->profile()->firstOrFail();
        $profile->update($request->validated());

        return response()->json([
            'profile' => $profile->fresh(),
            'message' => 'Profile updated successfully',
        ]);
    }
}
