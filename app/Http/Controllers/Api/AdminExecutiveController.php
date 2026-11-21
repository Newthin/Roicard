<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Growth\ExecutiveService;
use Illuminate\Http\JsonResponse;

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
}
