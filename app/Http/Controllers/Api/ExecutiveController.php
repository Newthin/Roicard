<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Growth\ExecutiveDashboardService;
use App\Services\Growth\ExecutiveService;
use Illuminate\Http\JsonResponse;

class ExecutiveController extends Controller
{
    public function __construct(
        protected ExecutiveService $executives,
        protected ExecutiveDashboardService $dashboard
    ) {}

    /** Referral assets for the authenticated Executive plan holder. */
    public function referral(): JsonResponse
    {
        $user = auth()->user();

        if (!$this->executives->isExecutive($user)) {
            return response()->json(['message' => 'Executive access required.'], 403);
        }

        return response()->json([
            'referral' => $this->executives->payload(
                $this->executives->ensureForUser($user),
                $user
            ),
        ]);
    }

    /** Read-only performance and payout dashboard for the authenticated Executive. */
    public function dashboard(): JsonResponse
    {
        $user = auth()->user();

        if (!$this->executives->isExecutive($user)) {
            return response()->json(['message' => 'Executive access required.'], 403);
        }

        return response()->json(['dashboard' => $this->dashboard->payload($user)]);
    }
}
