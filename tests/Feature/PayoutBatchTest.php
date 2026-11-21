<?php

namespace Tests\Feature;

use App\Models\AdminActionLog;
use App\Models\Commission;
use App\Models\DiscountCampaign;
use App\Models\Payment;
use App\Models\PayoutBatch;
use App\Models\PayoutBatchItem;
use App\Models\PayoutSetting;
use App\Models\Plan;
use App\Models\User;
use App\Services\Billing\SubscriptionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/** Growth Network item 4 — payout settings, batching and finance approval. */
class PayoutBatchTest extends TestCase
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
    protected function referred(array $extra = []): array
    {
        $executive = $this->executive();
        $member = $this->member($extra);
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
        // Sanctum caches the authenticated user between requests in one test.
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

    protected function generate(bool $force = false): array
    {
        return $this->withToken($this->asAdmin())
            ->postJson('/api/admin/payout/batches/generate', ['force' => $force])
            ->assertOk()
            ->json();
    }

    public function test_settings_default_to_the_agreed_payout_rules(): void
    {
        $settings = $this->withToken($this->asAdmin())
            ->getJson('/api/admin/payout/settings')
            ->assertOk()
            ->json('settings');

        $this->assertSame('100.00', $settings['minimum_amount']);
        $this->assertSame(14, $settings['cadence_days']);
        $this->assertTrue($settings['is_enabled']);
        $this->assertNull($settings['last_generated_at']);
    }

    public function test_admin_can_update_settings_and_the_change_is_audited(): void
    {
        $response = $this->withToken($this->asAdmin())
            ->patchJson('/api/admin/payout/settings', [
                'minimum_amount' => 150,
                'cadence_days' => 30,
                'is_enabled' => false,
            ])
            ->assertOk();

        $this->assertSame('150.00', $response->json('settings.minimum_amount'));
        $this->assertSame(30, $response->json('settings.cadence_days'));
        $this->assertFalse($response->json('settings.is_enabled'));
        $this->assertDatabaseHas('admin_action_logs', ['action' => 'payout_settings_updated']);
    }

    public function test_generation_batches_only_executives_reaching_the_minimum(): void
    {
        [, $memberA] = $this->referred();
        $this->annualPurchase($memberA);

        DiscountCampaign::create([
            'code' => 'PROMO',
            'name' => 'Promo',
            'amount' => 200,
            'is_active' => true,
        ]);
        [, $memberB] = $this->referred(['campaign_code' => 'PROMO']);
        $this->annualPurchase($memberB);

        $this->assertSame('100.00', Commission::where('member_user_id', $memberA->id)->firstOrFail()->amount);
        $this->assertSame('60.00', Commission::where('member_user_id', $memberB->id)->firstOrFail()->amount);

        $result = $this->generate();

        $this->assertSame('1 payout batch(es) generated.', $result['message']);
        $this->assertCount(1, $result['batches']);
        $this->assertSame(PayoutBatch::STATUS_PENDING, $result['batches'][0]['status']);
        $this->assertSame('100.00', $result['batches'][0]['total_amount']);
        $this->assertSame($memberA->referred_by_user_id, $result['batches'][0]['items'][0]['executive_user_id']);

        $this->assertSame(1, PayoutBatch::count());
        $this->assertSame(1, PayoutBatchItem::count());
        $this->assertNull(
            Commission::where('member_user_id', $memberB->id)->firstOrFail()->payoutBatchItem
        );
        $this->assertNotNull(PayoutSetting::current()->last_generated_at);
    }

    public function test_generation_is_idempotent_until_forced_after_the_cadence_window(): void
    {
        [, $firstMember] = $this->referred();
        $this->annualPurchase($firstMember);
        $this->generate();

        [, $secondMember] = $this->referred();
        $this->annualPurchase($secondMember);

        $this->assertSame('No eligible payouts in this window.', $this->generate()['message']);
        $this->assertSame(1, PayoutBatch::count());

        $result = $this->generate(true);

        $this->assertCount(1, $result['batches']);
        $this->assertSame(2, PayoutBatch::count());
        $this->assertSame(2, PayoutBatchItem::count());
    }

    public function test_admin_can_approve_a_pending_batch_once(): void
    {
        [, $member] = $this->referred();
        $this->annualPurchase($member);
        $this->generate();
        $batch = PayoutBatch::firstOrFail();

        $response = $this->withToken($this->asAdmin())
            ->postJson("/api/admin/payout/batches/{$batch->id}/approve")
            ->assertOk();

        $this->assertSame(PayoutBatch::STATUS_APPROVED, $response->json('batch.status'));
        $this->assertNotNull($response->json('batch.approved_at'));
        $this->assertNotNull($response->json('batch.approved_by_user_id'));
        $this->assertSame('approved', $response->json('batch.items.0.status'));
        $this->assertDatabaseHas('admin_action_logs', ['action' => 'payout_batch_approved']);

        $this->withToken($this->asAdmin())
            ->postJson("/api/admin/payout/batches/{$batch->id}/approve")
            ->assertStatus(422);
    }

    public function test_reversing_a_commission_detaches_it_from_a_pending_batch(): void
    {
        [, $member] = $this->referred();
        $payment = $this->annualPurchase($member);
        $this->generate();
        $batch = PayoutBatch::firstOrFail();

        $this->postJson('/api/payments/webhook/mock', [
            'event' => 'charge.refunded',
            'data' => ['reference' => $payment->provider_reference],
        ])->assertOk();

        $this->assertSame(Commission::STATUS_CANCELLED, Commission::firstOrFail()->status);
        $this->assertSame(0, PayoutBatchItem::count());
        $this->assertSame(0, PayoutBatch::count());
        $this->assertDatabaseMissing('payout_batches', ['id' => $batch->id]);
    }

    public function test_an_approved_batch_survives_a_later_commission_reversal(): void
    {
        [, $member] = $this->referred();
        $payment = $this->annualPurchase($member);
        $this->generate();
        $batch = PayoutBatch::firstOrFail();

        $this->withToken($this->asAdmin())
            ->postJson("/api/admin/payout/batches/{$batch->id}/approve")
            ->assertOk();

        $this->postJson('/api/payments/webhook/mock', [
            'event' => 'charge.refunded',
            'data' => ['reference' => $payment->provider_reference],
        ])->assertOk();

        $this->assertSame(PayoutBatch::STATUS_APPROVED, $batch->fresh()->status);
        $this->assertSame(1, PayoutBatchItem::count());
        $this->assertSame(Commission::STATUS_CANCELLED, Commission::firstOrFail()->status);
    }

    public function test_scheduled_command_respects_the_cadence_window(): void
    {
        [, $member] = $this->referred();
        $this->annualPurchase($member);

        $this->artisan('payouts:generate-batches')
            ->expectsOutputToContain('Generated 1 payout batch(es)')
            ->assertSuccessful();

        $this->artisan('payouts:generate-batches')
            ->expectsOutputToContain('Generated 0 payout batch(es)')
            ->assertSuccessful();

        $this->assertSame(1, PayoutBatch::count());
    }

    public function test_non_admin_cannot_manage_payouts(): void
    {
        $member = $this->member();

        $this->withToken($this->token($member))
            ->getJson('/api/admin/payout/settings')
            ->assertStatus(403);

        $this->withToken($this->token($member))
            ->postJson('/api/admin/payout/batches/generate')
            ->assertStatus(403);
    }
}
