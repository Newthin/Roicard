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
                    'user:id,first_name,last_name,email',
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

            $cv = $profile->getMedia('cv')->first();
            $avatar = $profile->getFirstMediaUrl('avatar');

            return [
                'id' => $profile->id,
                'slug' => $profile->slug,
                'title' => $profile->title,
                'organisation' => $profile->organisation,
                'whatsapp_phone' => $profile->whatsapp_phone,
                'date_of_birth' => $profile->date_of_birth?->toDateString(),
                'gender' => $profile->gender,
                'interests' => $profile->interestOptions->pluck('name')->all(),
                'location' => $profile->location,
                'bio' => $profile->bio,
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
