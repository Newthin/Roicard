<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreBlockedDateRequest;
use App\Models\MeetingBlockedDate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class MeetingBlockedDateController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $blockedDates = MeetingBlockedDate::where('user_id', Auth::id())
            ->orderBy('start_date')
            ->get();

        return response()->json(['data' => $blockedDates]);
    }

    public function store(StoreBlockedDateRequest $request): JsonResponse
    {
        $blockedDate = MeetingBlockedDate::create([
            'user_id' => Auth::id(),
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'reason' => $request->reason,
        ]);

        return response()->json(['data' => $blockedDate], 201);
    }

    public function destroy(MeetingBlockedDate $meetingBlockedDate): JsonResponse
    {
        $meetingBlockedDate->delete();

        return response()->json(null, 204);
    }
}
