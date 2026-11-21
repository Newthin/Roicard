<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PayoutBatch;
use App\Services\Growth\PayoutService;
use App\Traits\LogsAdminActions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Admin payout policy, batch generation and finance approval. */
class AdminPayoutController extends Controller
{
    use LogsAdminActions;

    public function __construct(protected PayoutService $payouts) {}

    public function settings(): JsonResponse
    {
        return response()->json(['settings' => $this->payouts->settings()]);
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'minimum_amount' => ['sometimes', 'numeric', 'min:0', 'max:100000'],
            'cadence_days' => ['sometimes', 'integer', 'min:1', 'max:365'],
            'is_enabled' => ['sometimes', 'boolean'],
        ]);

        $settings = $this->payouts->updateSettings($validated);

        $this->logAdminAction('payout_settings_updated', null, [
            'minimum_amount' => $settings->minimum_amount,
            'cadence_days' => $settings->cadence_days,
            'is_enabled' => $settings->is_enabled,
        ]);

        return response()->json([
            'settings' => $settings,
            'message' => 'Payout settings updated.',
        ]);
    }

    public function batches(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['sometimes', Rule::in([
                PayoutBatch::STATUS_PENDING,
                PayoutBatch::STATUS_APPROVED,
            ])],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $batches = PayoutBatch::query()
            ->withCount('items')
            ->with(['creator:id,first_name,last_name,email', 'approver:id,first_name,last_name,email'])
            ->when(!empty($validated['status']), fn ($query) => $query->where('status', $validated['status']))
            ->latest()
            ->paginate($validated['per_page'] ?? 25);

        return response()->json($batches);
    }

    public function batch(PayoutBatch $batch): JsonResponse
    {
        $batch->load([
            'items.executive:id,first_name,last_name,email',
            'items.commission:id,type,amount,cleared_at',
            'creator:id,first_name,last_name,email',
            'approver:id,first_name,last_name,email',
        ]);

        return response()->json(['batch' => $batch]);
    }

    public function generate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'force' => ['sometimes', 'boolean'],
        ]);

        $force = (bool) ($validated['force'] ?? false);
        $batches = $this->payouts->generateBatches($force, $request->user());

        $this->logAdminAction('payout_batches_generated', null, [
            'count' => $batches->count(),
            'force' => $force,
            'total_amount' => $batches->sum(fn ($batch) => (float) $batch->total_amount),
        ]);

        return response()->json([
            'batches' => $batches->load('items'),
            'message' => $batches->count()
                ? $batches->count().' payout batch(es) generated.'
                : 'No eligible payouts in this window.',
        ]);
    }

    public function approve(PayoutBatch $batch): JsonResponse
    {
        $approved = $this->payouts->approveBatch($batch, auth()->user());

        $this->logAdminAction('payout_batch_approved', null, [
            'batch_id' => $batch->id,
            'total_amount' => $approved->total_amount,
            'items' => $approved->items->count(),
        ]);

        return response()->json([
            'batch' => $approved->load('items'),
            'message' => 'Batch approved for payment.',
        ]);
    }
}
