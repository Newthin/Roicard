<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MeetingType;
use App\Services\AvailabilityEngine;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;

class MeetingTypeController extends Controller
{
    public function __construct(
        protected AvailabilityEngine $availabilityEngine
    ) {}

    public function index(Request $request): JsonResponse
    {
        $types = MeetingType::where('user_id', Auth::id())
            ->with(['availability', 'customQuestions'])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $types]);
    }

    public function store(\App\Http\Requests\StoreMeetingTypeRequest $request): JsonResponse
    {
        $type = MeetingType::create([
            'user_id' => Auth::id(),
            'name' => $request->name,
            'description' => $request->description,
            'duration_minutes' => $request->duration_minutes,
            'format' => $request->format,
            'location_detail' => $request->location_detail,
            'phone_number' => $request->phone_number,
            'meeting_link' => $request->meeting_link,
            'buffer_minutes' => $request->buffer_minutes ?? 0,
            'capacity' => $request->capacity ?? 1,
            'is_active' => $request->boolean('is_active', true),
            'sort_order' => $request->sort_order ?? 0,
            'min_notice_hours' => $request->min_notice_hours ?? 2,
            'advance_booking_days' => $request->advance_booking_days ?? 30,
            'max_bookings_per_day' => $request->max_bookings_per_day,
        ]);

        if ($request->has('availability')) {
            foreach ($request->availability as $rule) {
                $type->availability()->create($rule);
            }
        }

        if ($request->has('custom_questions')) {
            foreach ($request->custom_questions as $index => $question) {
                $type->customQuestions()->create([
                    'question' => $question['question'],
                    'is_required' => $question['is_required'] ?? false,
                    'sort_order' => $index,
                ]);
            }
        }

        $type->load(['availability', 'customQuestions']);

        $this->invalidatePublicProfileCache((int) $type->user_id);

        return response()->json(['data' => $type], 201);
    }

    public function show(MeetingType $meetingType): JsonResponse
    {
        $meetingType->load(['availability', 'customQuestions']);

        return response()->json(['data' => $meetingType]);
    }

    public function update(\App\Http\Requests\StoreMeetingTypeRequest $request, MeetingType $meetingType): JsonResponse
    {
        $meetingType->update([
            'name' => $request->name,
            'description' => $request->description,
            'duration_minutes' => $request->duration_minutes,
            'format' => $request->format,
            'location_detail' => $request->location_detail,
            'phone_number' => $request->phone_number,
            'meeting_link' => $request->meeting_link,
            'buffer_minutes' => $request->buffer_minutes ?? 0,
            'capacity' => $request->capacity ?? 1,
            'is_active' => $request->boolean('is_active', true),
            'sort_order' => $request->sort_order ?? 0,
            'min_notice_hours' => $request->min_notice_hours ?? 2,
            'advance_booking_days' => $request->advance_booking_days ?? 30,
            'max_bookings_per_day' => $request->max_bookings_per_day,
        ]);

        if ($request->has('availability')) {
            $meetingType->availability()->delete();
            foreach ($request->availability as $rule) {
                $meetingType->availability()->create($rule);
            }
        }

        if ($request->has('custom_questions')) {
            $meetingType->customQuestions()->delete();
            foreach ($request->custom_questions as $index => $question) {
                $meetingType->customQuestions()->create([
                    'question' => $question['question'],
                    'is_required' => $question['is_required'] ?? false,
                    'sort_order' => $index,
                ]);
            }
        }

        $meetingType->load(['availability', 'customQuestions']);

        $this->invalidatePublicProfileCache((int) $meetingType->user_id);

        return response()->json(['data' => $meetingType]);
    }

    public function destroy(MeetingType $meetingType): JsonResponse
    {
        if ($meetingType->bookings()->whereIn('status', ['pending', 'confirmed'])->exists()) {
            return response()->json(['error' => 'Cannot delete a meeting type with active bookings.'], 422);
        }

        $userId = (int) $meetingType->user_id;

        $meetingType->delete();

        $this->invalidatePublicProfileCache($userId);

        return response()->json(null, 204);
    }

    /**
     * Bust the cached public profile so meeting-type changes
     * (create / activate / deactivate / delete) are visible immediately.
     */
    protected function invalidatePublicProfileCache(int $userId): void
    {
        try {
            $slug = \App\Models\Profile::where('user_id', $userId)->value('slug');

            if ($slug) {
                \Illuminate\Support\Facades\Cache::forget("public_profile:{$slug}");
            }
            \Illuminate\Support\Facades\Cache::forget('public_profiles_sitemap');
        } catch (\Throwable) {
            // Cache invalidation is best-effort; never break the request.
        }
    }

    /**
     * Get available time slots using the AvailabilityEngine.
     */
    public function slots(MeetingType $meetingType, Request $request): JsonResponse
    {
        $request->validate([
            'from' => ['required', 'date'],
            'to' => ['required', 'date', 'after:from'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $slots = $this->availabilityEngine->getAvailableSlots(
            $meetingType,
            Carbon::parse($request->from),
            Carbon::parse($request->to),
            $request->integer('limit', 50)
        );

        return response()->json(['data' => $slots]);
    }
}
