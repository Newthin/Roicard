<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\DeliveryRequest;
use App\Models\SmartCard;
use Illuminate\Http\JsonResponse;

class SmartCardController extends Controller
{
    public function storeDelivery(DeliveryRequest $request): JsonResponse
    {
        $userId = auth()->id();

        // Explicitly scope to the authenticated user — never accept a user_id
        // from the request body (DeliveryRequest does not include one).
        $existing = SmartCard::where('user_id', $userId)->first();

        if ($existing) {
            return response()->json(['message' => 'Delivery address already submitted'], 400);
        }

        $smartCard = SmartCard::create([
            'user_id' => $userId,
            'inventory_status' => SmartCard::STATUS_ASSIGNED,
            'assigned_at' => now(),
            ...$request->validated(),
        ]);

        return response()->json([
            'smart_card' => $smartCard,
            'message' => 'Delivery address saved successfully',
        ], 201);
    }
}
