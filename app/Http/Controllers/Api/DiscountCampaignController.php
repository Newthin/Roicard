<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DiscountCampaign;
use App\Traits\LogsAdminActions;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Admin management of discount campaigns.
 *
 * Campaigns are the data source for member pricing: each one defines a code
 * and the activation fee its members pay, plus an optional window and an
 * open/closed flag. Admins create them here — future discounts need no code
 * changes.
 */
class DiscountCampaignController extends Controller
{
    use LogsAdminActions;

    /** Public: return currently live campaigns so the register form knows whether to show the code field. */
    public function active(): JsonResponse
    {
        $campaigns = DiscountCampaign::query()
            ->where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('starts_at')->orWhere('starts_at', '<=', now());
            })
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>=', now());
            })
            ->select('code', 'name', 'amount')
            ->get();

        return response()->json(['campaigns' => $campaigns]);
    }

    public function index(): JsonResponse
    {
        $campaigns = DiscountCampaign::query()
            ->withCount('users')
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['campaigns' => $campaigns]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validatePayload($request);

        $campaign = DiscountCampaign::create([
            'code' => $this->normalizeCode($validated['code']),
            'name' => trim($validated['name']),
            'amount' => (float) $validated['amount'],
            'starts_at' => $this->parseDate($validated['starts_at'] ?? null),
            'expires_at' => $this->parseDate($validated['expires_at'] ?? null),
            'is_active' => $request->boolean('is_active', true),
        ]);

        $this->logAdminAction('create_discount_campaign');

        return response()->json([
            'campaign' => $campaign->loadCount('users'),
            'message' => 'Discount campaign created',
        ], 201);
    }

    public function update(string $id, Request $request): JsonResponse
    {
        $campaign = DiscountCampaign::findOrFail($id);

        $validated = $this->validatePayload($request, $campaign);

        if (array_key_exists('code', $validated)) {
            $campaign->code = $this->normalizeCode($validated['code']);
        }
        if (array_key_exists('name', $validated)) {
            $campaign->name = trim($validated['name']);
        }
        if (array_key_exists('amount', $validated)) {
            $campaign->amount = (float) $validated['amount'];
        }
        if (array_key_exists('starts_at', $validated)) {
            $campaign->starts_at = $this->parseDate($validated['starts_at']);
        }
        if (array_key_exists('expires_at', $validated)) {
            $campaign->expires_at = $this->parseDate($validated['expires_at']);
        }
        if ($request->has('is_active')) {
            $campaign->is_active = $request->boolean('is_active');
        }

        $campaign->save();

        $this->logAdminAction('update_discount_campaign');

        return response()->json([
            'campaign' => $campaign->loadCount('users'),
            'message' => 'Discount campaign updated',
        ]);
    }

    /** Shared validation for create/update. */
    private function validatePayload(Request $request, ?DiscountCampaign $campaign = null): array
    {
        $required = $campaign ? 'sometimes' : 'required';

        return $request->validate([
            'code' => [
                $required, 'string', 'max:40',
                Rule::unique('discount_campaigns', 'code')->ignore($campaign?->id),
            ],
            'name' => [$required, 'string', 'max:120'],
            'amount' => [$required, 'numeric', 'min:0', 'max:100000'],
            'starts_at' => ['nullable', 'date'],
            'expires_at' => ['nullable', 'date', 'after:starts_at'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
    }

    private function normalizeCode(string $code): string
    {
        return mb_strtoupper(trim($code));
    }

    private function parseDate(?string $value): ?Carbon
    {
        return $value ? Carbon::parse($value) : null;
    }
}
