<?php

namespace Tests\Feature;

use App\Models\AdminActionLog;
use App\Models\Commission;
use App\Models\Payment;
use App\Models\PayoutBatch;
use App\Models\PayoutBatchItem;
use App\Models\Plan;
use App\Models\User;
use App\Services\Billing\SubscriptionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/** Growth Network item 5 — transfer references, paid state and CSV export. */
class PayoutTransferTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['app.payment_provider' => 'mock']);
        Mail::fake();
    }

    protected function member(array $attributes = []): User
    {
        return User::factory()->create([
            'status' => 'draft',
            'role' => 'member',
            ...$attributes,
        ]);
    }

    protected function admin(): User
    {
        return User::factory()->create(['status' => 'active', 'role' => 'admin']);
    }

    protected function token(User $user): string
    {
        return $user->createToken('test')->plainTextToken;
    }

    protected function asAdmin(): string
    {
        auth()->forgetGuards();

        return $this->token($this->admin());
    }

    protected function executive(): User
    {
        $user = $this->member();
        $user->profile()->create([]);

        app(SubscriptionService::class)
            ->grantPlan($user, Plan::EXECUTIVE, null, false, 'test_grant');

        return $user->fresh();
    }

    /** @return array{0: User, 1: User} */
    protected function referred(): array
    {
        $executive = $this->executive();
        $member = $this->member();
        $member->profile()->create([]);

        $member->forceFill([
            'referred_by_user_id' => $executive->id,
            'referred_by_code' => 'TESTCODE1',
            'referred_at' => now(),
        ])->save();

        return [$executive, $member];
    }

    protected function annualPurchase(User $member): Payment
    {
        auth()->forgetGuards();

        $response = $this->withToken($this->token($member))
            ->withHeader('Idempotency-Key', 'key-'.uniqid())
            ->postJson('/api/payments/initiate', [
                'plan' => Plan::ANNUAL,
                'method' => 'card',
                'amount' => 1,
            ]);

        $response->assertOk();
        $payment = Payment::findOrFail($response->json('payment.id'));

        $this->withToken($this->token($member))
            ->postJson('/api/payments/mock/confirm', [
                'reference' => $payment->provider_reference,
            ])
            ->assertOk();

        return $payment;
    }

    protected function approvedBatch(): array
    {
        [, $member] = $this->referred();
        $this->annualPurchase($member);

        $this->withToken($this->asAdmin())
            ->postJson('/api/admin/payout/batches/generate')
            ->assertOk();

        $batch = PayoutBatch::firstOrFail();

        $this->withToken($this->asAdmin())
            ->postJson("/api/admin/payout/batches/{$batch->id}/approve")
            ->assertOk();

        return [$batch->fresh(), $batch->items()->firstOrFail()];
    }

    public function test_transfer_reference_can_be_saved_and_batch_marked_paid(): void
    {
        [$batch, $item] = $this->approvedBatch();
        $admin = $this->admin();
        auth()->forgetGuards();

        $reference = $this->withToken($this->token($admin))
            ->patchJson(
                "/api/admin/payout/batches/{$batch->id}/items/{$item->id}/transfer-reference",
                ['transfer_reference' => 'TXN-2026-001']
            )
            ->assertOk()
            ->json('item');

        $this->assertSame('TXN-2026-001', $reference['transfer_reference']);
        $this->assertDatabaseHas('admin_action_logs', ['action' => 'payout_transfer_reference_set']);

        $paid = $this->withToken($this->token($admin))
            ->postJson("/api/admin/payout/batches/{$batch->id}/mark-paid")
            ->assertOk()
            ->json('batch');

        $this->assertSame(PayoutBatch::STATUS_PAID, $paid['status']);
        $this->assertNotNull($paid['paid_at']);
        $this->assertSame($admin->id, $paid['paid_by_user_id']);
        $this->assertSame(PayoutBatchItem::STATUS_PAID, $paid['items'][0]['status']);
        $this->assertNotNull($paid['items'][0]['paid_at']);
        $this->assertDatabaseHas('admin_action_logs', ['action' => 'payout_batch_marked_paid']);

        $this->withToken($this->token($admin))
            ->getJson('/api/admin/payout/batches?status=paid')
            ->assertOk()
            ->assertJsonPath('data.0.id', $batch->id);
    }

    public function test_batch_cannot_be_marked_paid_without_reference_or_approved_status(): void
    {
        [, $member] = $this->referred();
        $this->annualPurchase($member);

        $this->withToken($this->asAdmin())
            ->postJson('/api/admin/payout/batches/generate')
            ->assertOk();

        $batch = PayoutBatch::firstOrFail();
        $item = $batch->items()->firstOrFail();

        $this->withToken($this->asAdmin())
            ->patchJson(
                "/api/admin/payout/batches/{$batch->id}/items/{$item->id}/transfer-reference",
                ['transfer_reference' => 'EARLY-REF']
            )
            ->assertStatus(422);

        $this->withToken($this->asAdmin())
            ->postJson("/api/admin/payout/batches/{$batch->id}/mark-paid")
            ->assertStatus(422);

        $this->withToken($this->asAdmin())
            ->postJson("/api/admin/payout/batches/{$batch->id}/approve")
            ->assertOk();

        $this->withToken($this->asAdmin())
            ->postJson("/api/admin/payout/batches/{$batch->id}/mark-paid")
            ->assertStatus(422);

        $this->assertSame(PayoutBatch::STATUS_APPROVED, $batch->fresh()->status);
        $this->assertNull($item->fresh()->transfer_reference);
        $this->assertSame(0, AdminActionLog::where('action', 'payout_batch_marked_paid')->count());
    }

    public function test_transfer_reference_must_belong_to_the_selected_batch(): void
    {
        [, $memberA] = $this->referred();
        $this->annualPurchase($memberA);
        [, $memberB] = $this->referred();
        $this->annualPurchase($memberB);

        $this->withToken($this->asAdmin())
            ->postJson('/api/admin/payout/batches/generate')
            ->assertOk();

        $this->assertSame(2, PayoutBatch::count());

        $firstBatch = PayoutBatch::orderBy('id')->firstOrFail();
        $secondItem = PayoutBatch::with('items')->orderByDesc('id')->firstOrFail()->items->firstOrFail();

        $this->withToken($this->asAdmin())
            ->postJson("/api/admin/payout/batches/{$firstBatch->id}/approve")
            ->assertOk();

        $this->withToken($this->asAdmin())
            ->patchJson(
                "/api/admin/payout/batches/{$firstBatch->id}/items/{$secondItem->id}/transfer-reference",
                ['transfer_reference' => 'WRONG-BATCH']
            )
            ->assertStatus(422);

        $this->assertNull($secondItem->fresh()->transfer_reference);
    }

    public function test_csv_export_contains_one_approved_batch_and_is_audited(): void
    {
        [$executive, $member] = $this->referred();
        $this->annualPurchase($member);

        $this->withToken($this->asAdmin())
            ->postJson('/api/admin/payout/batches/generate')
            ->assertOk();

        $batch = PayoutBatch::firstOrFail();
        $item = $batch->items()->firstOrFail();

        $this->withToken($this->asAdmin())
            ->getJson("/api/admin/payout/batches/{$batch->id}/csv")
            ->assertStatus(422);

        $this->withToken($this->asAdmin())
            ->postJson("/api/admin/payout/batches/{$batch->id}/approve")
            ->assertOk();

        $this->withToken($this->asAdmin())
            ->patchJson(
                "/api/admin/payout/batches/{$batch->id}/items/{$item->id}/transfer-reference",
                ['transfer_reference' => 'TXN-CSV-001']
            )
            ->assertOk();

        $response = $this->withToken($this->asAdmin())
            ->get("/api/admin/payout/batches/{$batch->id}/csv")
            ->assertOk();

        $response->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
        $response->assertHeader('Content-Disposition', 'attachment; filename="payout-batch-'.$batch->id.'.csv"');

        $csv = $response->getContent();
        $this->assertStringContainsString(
            'batch_id,executive_id,executive_name,email,commission_id,commission_type,amount,currency,transfer_reference,paid_at,status',
            $csv
        );
        $this->assertStringContainsString((string) $batch->id, $csv);
        $this->assertStringContainsString((string) $executive->id, $csv);
        $this->assertStringContainsString($executive->email, $csv);
        $this->assertStringContainsString((string) $item->commission_id, $csv);
        $this->assertStringContainsString('100.00', $csv);
        $this->assertStringContainsString('TXN-CSV-001', $csv);
        $this->assertStringContainsString('approved', $csv);

        $this->assertDatabaseHas('admin_action_logs', ['action' => 'payout_batch_csv_exported']);
    }

    public function test_csv_export_is_available_after_batch_is_paid(): void
    {
        [$batch, $item] = $this->approvedBatch();

        $this->withToken($this->asAdmin())
            ->patchJson(
                "/api/admin/payout/batches/{$batch->id}/items/{$item->id}/transfer-reference",
                ['transfer_reference' => 'TXN-PAID-001']
            )
            ->assertOk();

        $this->withToken($this->asAdmin())
            ->postJson("/api/admin/payout/batches/{$batch->id}/mark-paid")
            ->assertOk();

        $this->withToken($this->asAdmin())
            ->get("/api/admin/payout/batches/{$batch->id}/csv")
            ->assertOk()
            ->assertSee('TXN-PAID-001')
            ->assertSee(PayoutBatchItem::STATUS_PAID);
    }

    public function test_non_admin_cannot_manage_transfer_references_paid_state_or_export(): void
    {
        [$batch, $item] = $this->approvedBatch();
        $member = $this->member();
        auth()->forgetGuards();

        $this->withToken($this->token($member))
            ->patchJson(
                "/api/admin/payout/batches/{$batch->id}/items/{$item->id}/transfer-reference",
                ['transfer_reference' => 'NOPE']
            )
            ->assertStatus(403);

        $this->withToken($this->token($member))
            ->postJson("/api/admin/payout/batches/{$batch->id}/mark-paid")
            ->assertStatus(403);

        $this->withToken($this->token($member))
            ->get("/api/admin/payout/batches/{$batch->id}/csv")
            ->assertStatus(403);

        $this->assertSame(0, Commission::where('member_user_id', $member->id)->count());
    }
}
