<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\RecordAnalyticsJob;
use App\Models\Profile;
use App\Services\AnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class PublicProfileController extends Controller
{
    public function __construct(
        protected AnalyticsService $analyticsService
    ) {}

    public function show(string $slug, Request $request): JsonResponse
    {
        $cacheKey = "public_profile:{$slug}";

        $data = Cache::remember($cacheKey, 3600, function () use ($slug) {
            $profile = Profile::where('slug', $slug)
                ->with([
                    'user:id,first_name,last_name,email,status',
                    'socialLinks',
                    'education',
                    'experience',
                    'achievements',
                    'interestOptions:id,name',
                ])
                ->first();

            if (!$profile) {
                return null;
            }

            // Draft profiles are not publicly visible — only activated
            // (paid) members can be viewed via their share link.
            if ($profile->user->status !== 'active') {
                return ['_draft' => true, 'slug' => $slug];
            }

            $cv = $profile->getMedia('cv')->first();
            $avatar = $profile->getFirstMediaUrl('avatar');

            return [
                'id' => $profile->id,
                'user_id' => $profile->user_id,
                'slug' => $profile->slug,
                'title' => $profile->title,
                'role_description' => $profile->role_description,
                'organisation' => $profile->organisation,
                'whatsapp_phone' => $profile->whatsapp_phone,
                'phone' => $profile->phone,
                'date_of_birth' => $profile->date_of_birth?->toDateString(),
                'gender' => $profile->gender,
                'interests' => $profile->interestOptions->pluck('name')->all(),
                'location' => $profile->location,
                'bio' => $profile->bio,
                'seeking' => $profile->seeking,
                'offering' => $profile->offering,
                'avatar' => $avatar,
                'user' => [
                    'first_name' => $profile->user->first_name,
                    'last_name' => $profile->user->last_name,
                    'email' => $profile->user->email,
                ],
                'social_links' => $profile->socialLinks,
                'education' => $profile->education,
                'experience' => $profile->experience,
                'achievements' => $profile->achievements,
                'cv' => $cv ? [
                    'url' => $cv->getUrl(),
                    'name' => $cv->name,
                    'size_kb' => (int) round($cv->size / 1024),
                ] : null,
            ];
        });

        if (!$data) {
            return response()->json(['message' => 'Profile not found'], 404);
        }

        // Draft profile — profile exists but user hasn't activated yet
        if (!empty($data['_draft'])) {
            return response()->json([
                'message' => 'This profile is not yet available',
                'status' => 'draft',
            ], 403);
        }

        $source = $request->input('src', 'profile_view');
        RecordAnalyticsJob::dispatch($data['user_id'] ?? $this->userIdForSlug($slug), $source);

        return response()->json($data);
    }

    protected function userIdForSlug(string $slug): int
    {
        return (int) Profile::where('slug', $slug)->value('user_id');
    }

    public function trackEvent(string $slug, Request $request): JsonResponse
    {
        $profile = Profile::where('slug', $slug)->where('is_live', true)->firstOrFail();

        $validated = $request->validate([
            'type' => ['required', 'string', 'in:contact_save,whatsapp_tap'],
        ]);

        RecordAnalyticsJob::dispatch(
            $profile->user_id,
            $validated['type']
        );

        return response()->json(['message' => 'Event recorded']);
    }
}
