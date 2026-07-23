<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnalyticsController extends Controller
{
    public function __construct(
        protected AnalyticsService $analyticsService
    ) {}

    public function summary(Request $request): JsonResponse
    {
        $period = $request->input('period', '30d');
        $summary = $this->analyticsService->summary(auth()->id(), $period);

        return response()->json($summary);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => ['required', 'string', 'in:profile_view,card_tap,qr_scan,connection_request,contact_save,whatsapp_tap'],
            'metadata' => ['nullable', 'array'],
        ]);

        $this->analyticsService->record(
            auth()->id(),
            $validated['type'],
            $validated['metadata'] ?? null
        );

        return response()->json(['message' => 'Event recorded']);
    }
}
