<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MeetingBooking;
use App\Models\MeetingType;
use App\Services\BookingEngine;
use App\Services\IcsService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;

class MeetingBookingController extends Controller
{
    public function __construct(
        protected BookingEngine $bookingEngine
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = MeetingBooking::where('host_user_id', Auth::id())
            ->with('meetingType');

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('upcoming') && $request->boolean('upcoming')) {
            $query->where('start_time', '>', now('UTC'));
        }

        $bookings = $query->orderBy('start_time', 'desc')->paginate(20);

        return response()->json($bookings);
    }

    public function show(MeetingBooking $meetingBooking): JsonResponse
    {
        $meetingBooking->load(['meetingType', 'customAnswers', 'rescheduleRequests.requestedBy']);

        return response()->json(['data' => $meetingBooking]);
    }

    public function confirm(MeetingBooking $meetingBooking): JsonResponse
    {
        $booking = $this->bookingEngine->confirmBooking($meetingBooking);

        return response()->json(['data' => $booking]);
    }

    public function decline(MeetingBooking $meetingBooking, Request $request): JsonResponse
    {
        $request->validate([
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $booking = $this->bookingEngine->declineBooking($meetingBooking, $request->reason);

        return response()->json(['data' => $booking]);
    }

    public function cancel(MeetingBooking $meetingBooking, Request $request): JsonResponse
    {
        $request->validate([
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $booking = $this->bookingEngine->cancelBookingByHost($meetingBooking, $request->reason);

        return response()->json(['data' => $booking]);
    }

    public function proposeReschedule(MeetingBooking $meetingBooking, Request $request): JsonResponse
    {
        $request->validate([
            'proposed_start_time' => ['required', 'date'],
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $rescheduleRequest = $this->bookingEngine->proposeReschedule(
            $meetingBooking,
            Auth::id(),
            Carbon::parse($request->proposed_start_time, 'UTC'),
            $request->reason
        );

        return response()->json(['data' => $rescheduleRequest], 201);
    }

    public function acceptReschedule(MeetingBooking $meetingBooking, \App\Models\MeetingRescheduleRequest $rescheduleRequest): JsonResponse
    {
        $booking = $this->bookingEngine->acceptReschedule($rescheduleRequest);

        return response()->json(['data' => $booking]);
    }

    public function declineReschedule(MeetingBooking $meetingBooking, \App\Models\MeetingRescheduleRequest $rescheduleRequest): JsonResponse
    {
        $request = $this->bookingEngine->declineReschedule($rescheduleRequest);

        return response()->json(['data' => $request]);
    }

    /**
     * Public booking endpoint — guest books a meeting without authentication.
     * Uses idempotency middleware for idempotent requests.
     */
    public function book(MeetingType $meetingType, Request $request): JsonResponse
    {
        $request->validate([
            'guest_name' => ['required', 'string', 'max:255'],
            'guest_email' => ['required', 'string', 'email', 'max:255'],
            'guest_phone' => ['nullable', 'string', 'max:20'],
            'guest_notes' => ['nullable', 'string', 'max:2000'],
            'start_time' => ['required', 'date'],
            'timezone' => ['required', 'string', 'max:50'],
            'custom_answers' => ['nullable', 'array'],
            'custom_answers.*.question' => ['required_with:custom_answers', 'string', 'max:255'],
            'custom_answers.*.answer' => ['required_with:custom_answers', 'string', 'max:1000'],
        ]);

        try {
            $booking = $this->bookingEngine->book(
                $meetingType,
                $request->guest_name,
                $request->guest_email,
                Carbon::parse($request->start_time, 'UTC'),
                $request->timezone,
                $request->guest_phone,
                $request->guest_notes,
                $request->custom_answers
            );

            return response()->json(['data' => $booking], 201);
        } catch (\App\Exceptions\SlotUnavailableException $e) {
            return response()->json(['error' => $e->getMessage()], 409);
        }
    }

    /**
     * Public cancellation — guest cancels using their cancellation token.
     */
    public function cancelByToken(string $token, Request $request): JsonResponse
    {
        $request->validate([
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        try {
            $booking = $this->bookingEngine->cancelBookingByGuest($token, $request->reason);

            return response()->json([
                'data' => [
                    'id' => $booking->id,
                    'status' => $booking->status,
                ],
                'message' => 'Booking cancelled successfully.',
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['error' => 'Invalid or expired cancellation token.'], 404);
        }
    }

    /**
     * Download ICS calendar file for a confirmed meeting.
     */
    public function downloadIcs(MeetingBooking $meetingBooking): Response
    {
        $icsService = app(IcsService::class);
        $content = $icsService->generateContent($meetingBooking);
        $filename = $icsService->generateFilename($meetingBooking);

        return response($content, 200, [
            'Content-Type' => 'text/calendar; charset=utf-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }
}
