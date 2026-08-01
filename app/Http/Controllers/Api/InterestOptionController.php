<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InterestOption;
use Illuminate\Http\JsonResponse;

class InterestOptionController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'interests' => InterestOption::active()->pluck('name'),
        ]);
    }
}
