<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Commission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Read-only commission ledger for finance/admin review. */
class AdminCommissionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'executive_user_id' => ['sometimes', 'integer'],
            'member_user_id' => ['sometimes', 'integer'],
            'status' => ['sometimes', 'string', 'max:16'],
            'type' => ['sometimes', 'string', 'max:32'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $query = Commission::query()
            ->with([
                'executive:id,first_name,last_name,email',
                'member:id,first_name,last_name,email',
                'payment:id,provider_reference,amount,purpose,status',
                'subscription:id,status',
            ])
            ->latest();

        foreach (['executive_user_id', 'member_user_id', 'status', 'type'] as $field) {
            if (!empty($validated[$field])) {
                $query->where($field, $validated[$field]);
            }
        }

        $commissions = $query->paginate($validated['per_page'] ?? 25);

        $commissions->getCollection()->transform(fn (Commission $commission) => [
            'id' => $commission->id,
            'executive_user_id' => $commission->executive_user_id,
            'executive' => $commission->executive?->only(['id', 'first_name', 'last_name', 'email']),
            'member_user_id' => $commission->member_user_id,
            'member' => $commission->member?->only(['id', 'first_name', 'last_name', 'email']),
            'type' => $commission->type,
            'amount' => $commission->amount,
            'collected_amount' => $commission->collected_amount,
            'currency' => $commission->currency,
            'status' => $commission->status,
            'payment' => $commission->payment
                ? [
                    'id' => $commission->payment->id,
                    'reference' => $commission->payment->provider_reference,
                    'amount' => $commission->payment->amount,
                    'purpose' => $commission->payment->purpose,
                ]
                : null,
            'subscription' => $commission->subscription
                ? ['id' => $commission->subscription->id, 'status' => $commission->subscription->status]
                : null,
            'cleared_at' => $commission->cleared_at?->toIso8601String(),
            'cancelled_at' => $commission->cancelled_at?->toIso8601String(),
            'cancellation_reason' => $commission->cancellation_reason,
            'created_at' => $commission->created_at?->toIso8601String(),
        ]);

        return response()->json($commissions);
    }
}
