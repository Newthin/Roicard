<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MeetingType;
use App\Models\User;
use App\Services\AvailabilityEngine;
use App\Services\BookingEngine;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PublicBookingController extends Controller
{
    public function __construct(
        protected AvailabilityEngine $availabilityEngine,
        protected BookingEngine $bookingEngine
    ) {}

    /**
     * Step 1-2: Get meeting types for a member's public profile.
     * Only returns active types with minimal info (no private data).
     */
    public function meetingTypes(string $slug): JsonResponse
    {
        $profile = \App\Models\Profile::where('slug', $slug)
            ->where('is_live', true)
            ->first();

        if (!$profile || !$profile->user || $profile->user->trashed() || $profile->user->status !== 'active') {
            return response()->json(['message' => 'Member not found'], 404);
        }

        $types = MeetingType::where('user_id', $profile->user_id)
            ->where('is_active', true)
            ->with(['customQuestions'])
            ->orderBy('sort_order')
            ->get()
            ->map(fn (MeetingType $type) => [
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

        return response()->json(['data' => $types]);
    }

    /**
     * Step 3: Get available slots for a specific meeting type and date range.
     */
    public function slots(string $slug, MeetingType $meetingType, Request $request): JsonResponse
    {
        // Verify the meeting type belongs to this member
        $profile = \App\Models\Profile::where('slug', $slug)
            ->where('is_live', true)
            ->first();

        if (!$profile || $meetingType->user_id !== $profile->user_id) {
            return response()->json(['message' => 'Meeting type not found'], 404);
        }

        if (!$meetingType->is_active) {
            return response()->json(['message' => 'This meeting type is no longer available'], 404);
        }

        $request->validate([
            'from' => ['required', 'date'],
            'to' => ['required', 'date', 'after:from'],
        ]);

        $slots = $this->availabilityEngine->getAvailableSlots(
            $meetingType,
            Carbon::parse($request->from),
            Carbon::parse($request->to),
            $request->integer('limit', 50)
        );

        return response()->json(['data' => $slots]);
    }

    /**
     * Step 4-10: Submit a booking request.
     * Full validation, re-checks slot availability via BookingEngine.
     */
    public function book(string $slug, MeetingType $meetingType, Request $request): JsonResponse
    {
        // Verify the meeting type belongs to this member
        $profile = \App\Models\Profile::where('slug', $slug)
            ->where('is_live', true)
            ->first();

        if (!$profile || $meetingType->user_id !== $profile->user_id) {
            return response()->json(['message' => 'Meeting type not found'], 404);
        }

        if (!$meetingType->is_active) {
            return response()->json(['message' => 'This meeting type is no longer available'], 422);
        }

        // Validate all submitted fields
        $validated = $request->validate([
            'guest_name' => ['required', 'string', 'max:255'],
            'guest_email' => ['required', 'string', 'email', 'max:255'],
            'guest_phone' => ['nullable', 'string', 'max:20'],
            'guest_notes' => ['nullable', 'string', 'max:2000'],
            'start_time' => ['required', 'date'],
            'timezone' => ['required', 'string', 'max:50'],
            'format' => ['nullable', 'string', 'in:' . implode(',', \App\Models\MeetingType::FORMATS)],
            'custom_answers' => ['nullable', 'array'],
            'custom_answers.*.question_id' => ['required_with:custom_answers', 'integer'],
            'custom_answers.*.answer' => ['required_with:custom_answers', 'string', 'max:1000'],
        ]);

        // Validate custom answers against the meeting type's custom questions
        if (!empty($validated['custom_answers'])) {
            $requiredQuestions = $meetingType->customQuestions()
                ->where('is_required', true)
                ->pluck('id')
                ->toArray();

            $providedQuestionIds = array_column($validated['custom_answers'], 'question_id');

            // Check all required questions are answered
            $missingRequired = array_diff($requiredQuestions, $providedQuestionIds);
            if (!empty($missingRequired)) {
                return response()->json([
                    'message' => 'All required questions must be answered.',
                    'missing_question_ids' => $missingRequired,
                ], 422);
            }

            // Check all provided question IDs belong to this meeting type
            $validQuestionIds = $meetingType->customQuestions()->pluck('id')->toArray();
            $invalidIds = array_diff($providedQuestionIds, $validQuestionIds);
            if (!empty($invalidIds)) {
                return response()->json([
                    'message' => 'Invalid custom question IDs provided.',
                ], 422);
            }
        }

        // Resolve guest_user_id if the guest is an existing Roicard user
        $guestUserId = null;
        $existingUser = User::where('email', $validated['guest_email'])->first();
        if ($existingUser) {
            $guestUserId = $existingUser->id;
        }

        // Determine the format to use (guest override or type default)
        $format = $validated['format'] ?? $meetingType->format;

        try {
            // BookingEngine re-validates the slot inside a transaction
            $booking = $this->bookingEngine->book(
                $meetingType,
                $validated['guest_name'],
                $validated['guest_email'],
                Carbon::parse($validated['start_time'], 'UTC'),
                $validated['timezone'],
                $validated['guest_phone'] ?? null,
                $validated['guest_notes'] ?? null,
                null, // custom answers handled below
                $guestUserId
            );

            // Update with guest_user_id if applicable
            if ($guestUserId) {
                $booking->update(['guest_user_id' => $guestUserId]);
            }

            // Update format snapshot if guest selected a different format
            if ($format !== $meetingType->format) {
                $booking->update(['type_format' => $format]);
            }

            // Save custom answers with question_id reference
            if (!empty($validated['custom_answers'])) {
                foreach ($validated['custom_answers'] as $index => $answer) {
                    $question = $meetingType->customQuestions()->find($answer['question_id']);
                    if ($question) {
                        $booking->customAnswers()->create([
                            'question' => $question->question,
                            'answer' => $answer['answer'],
                            'sort_order' => $index,
                        ]);
                    }
                }
            }

            return response()->json([
                'data' => [
                    'id' => $booking->id,
                    'status' => $booking->status,
                    'start_time' => $booking->start_time->toIso8601String(),
                    'end_time' => $booking->end_time->toIso8601String(),
                    'guest_name' => $booking->guest_name,
                    'guest_email' => $booking->guest_email,
                    'cancellation_url' => '/meetings/cancel/' . $booking->guest_cancellation_token,
                ],
                'message' => 'Booking request submitted successfully. You will receive a confirmation once the host approves.',
            ], 201);
        } catch (\App\Exceptions\SlotUnavailableException $e) {
            return response()->json([
                'error' => $e->getMessage(),
                'message' => 'This time slot is no longer available. Please select another time.',
            ], 409);
        }
    }
}
