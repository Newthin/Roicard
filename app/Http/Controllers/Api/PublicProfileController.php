<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\RecordAnalyticsJob;
use App\Models\Profile;
use App\Services\AnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\PersonalAccessToken;

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

            // Draft or deleted profiles are not publicly visible — only
            // activated (paid) members can be viewed via their share link.
            // A deleted account's user row is soft-deleted, so it may be
            // missing entirely from the eager load.
            if (!$profile->user || $profile->user->trashed() || $profile->user->status !== 'active') {
                return ['_draft' => true, 'slug' => $slug];
            }

            $cv = $profile->getMedia('cv')->first();
            $avatar = $profile->getFirstMediaUrl('avatar');

            // Load active meeting types with availability and custom questions
            $meetingTypes = \App\Models\MeetingType::where('user_id', $profile->user_id)
                ->where('is_active', true)
                ->with(['availability', 'customQuestions'])
                ->orderBy('sort_order')
                ->get()
                ->map(fn (\App\Models\MeetingType $type) => [
                    'id' => $type->id,
                    'name' => $type->name,
                    'description' => $type->description,
                    'duration_minutes' => $type->duration_minutes,
                    'format' => $type->format,
                    'format_label' => $type->format_label,
                    'location_detail' => $type->location_detail,
                    'custom_questions' => $type->customQuestions->map(fn ($q) => [
                        'id' => $q->id,
                        'question' => $q->question,
                        'is_required' => $q->is_required,
                    ]),
                ]);

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
                'meeting_types' => $meetingTypes,
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

        // Skip analytics for self-views — the profile owner viewing their own
        // profile from the dashboard should not inflate view counts or trigger
        // engagement emails. The route has no auth middleware, so we manually
        // resolve the user from the Sanctum Bearer token if present.
        $ownerUserId = $data['user_id'] ?? $this->userIdForSlug($slug);

        if (!$this->isSelfView($request, $ownerUserId)) {
            $source = $request->input('src', 'profile_view');
            RecordAnalyticsJob::dispatch($ownerUserId, $source);
        }

        return response()->json($data);
    }

    protected function userIdForSlug(string $slug): int
    {
        return (int) Profile::where('slug', $slug)->value('user_id');
    }

    /**
     * Determine whether the incoming request is from the profile owner
     * viewing their own profile. Resolves the user from the Sanctum
     * Bearer token (the frontend attaches it to every API call via
     * the axios interceptor, even on this public route).
     */
    protected function isSelfView(Request $request, int $ownerUserId): bool
    {
        $token = $request->bearerToken();
        if (!$token) {
            return false;
        }

        $accessToken = PersonalAccessToken::findToken($token);
        if (!$accessToken) {
            return false;
        }

        $user = $accessToken->tokenable;
        return $user && $user->id === $ownerUserId;
    }

    public function trackEvent(string $slug, Request $request): JsonResponse
    {
        $profile = Profile::where('slug', $slug)->where('is_live', true)->firstOrFail();

        $validated = $request->validate([
            'type' => ['required', 'string', 'in:contact_save,whatsapp_tap'],
        ]);

        // Skip self-tracking — owner actions on their own profile should not
        // count as engagement events.
        if (!$this->isSelfView($request, $profile->user_id)) {
            RecordAnalyticsJob::dispatch(
                $profile->user_id,
                $validated['type']
            );
        }

        return response()->json(['message' => 'Event recorded']);
    }

    /**
     * Public sitemap feed — slugs of all publicly viewable profiles (same
     * visibility rule as show(): activated member, not deleted). Consumed by
     * the Next.js sitemap route; cached for an hour and busted alongside the
     * per-profile cache.
     */
    public function sitemap(): JsonResponse
    {
        $profiles = Cache::remember('public_profiles_sitemap', 3600, function () {
            return Profile::query()
                ->join('users', 'users.id', '=', 'profiles.user_id')
                ->whereNull('users.deleted_at')
                ->where('users.status', 'active')
                ->where('profiles.is_live', true)
                ->whereNotNull('profiles.slug')
                ->orderBy('profiles.id')
                ->get(['profiles.slug', 'profiles.updated_at'])
                ->map(fn ($p) => [
                    'slug' => $p->slug,
                    'lastmod' => $p->updated_at?->toISOString(),
                ])
                ->all();
        });

        return response()->json(['data' => $profiles]);
    }
}
