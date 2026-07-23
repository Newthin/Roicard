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
        $user = auth()->user();

        if ($user->smartCard()->exists()) {
            return response()->json(['message' => 'Delivery address already submitted'], 400);
        }

        $smartCard = $user->smartCard()->create($request->validated());

        return response()->json([
            'smart_card' => $smartCard,
            'message' => 'Delivery address saved successfully',
        ], 201);
    }
}
