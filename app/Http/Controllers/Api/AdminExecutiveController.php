<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ReferralClick;
use App\Services\Growth\ExecutiveService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminExecutiveController extends Controller
{
    public function __construct(protected ExecutiveService $executives) {}

    public function index(): JsonResponse
    {
        return response()->json([
            'executives' => $this->executives->executives(),
        ]);
    }

    public function show(string $id): JsonResponse
    {
        $executive = $this->executives->executiveByUserId((int) $id);

        if (!$executive) {
            abort(404);
        }

        return response()->json(['executive' => $executive]);
    }

    /** Append-only click audit trail. Raw IPs are never returned or stored. */
    public function clicks(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['sometimes', 'string', 'max:20'],
            'user_id' => ['sometimes', 'integer'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $query = ReferralClick::query()
            ->with('user:id,first_name,last_name,email')
            ->with('executiveReferral:id,user_id,code')
            ->latest();

        if (!empty($validated['code'])) {
            $query->where('code', strtoupper($validated['code']));
        }

        if (!empty($validated['user_id'])) {
            $query->where('user_id', $validated['user_id']);
        }

        $clicks = $query->paginate($validated['per_page'] ?? 25);

        $clicks->getCollection()->transform(fn (ReferralClick $click) => [
            'id' => $click->id,
            'code' => $click->code,
            'user_id' => $click->user_id,
            'user' => $click->user?->only(['id', 'first_name', 'last_name', 'email']),
            'ip_hash' => $click->ip_hash,
            'user_agent' => $click->user_agent,
            'referrer' => $click->referrer,
            'created_at' => $click->created_at?->toIso8601String(),
        ]);

        return response()->json($clicks);
    }
}
