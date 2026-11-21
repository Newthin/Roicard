<?php

namespace Tests\Feature;

use App\Models\Payment;
use App\Models\PayoutBatch;
use App\Models\Plan;
use App\Models\ReferralClick;
use App\Models\User;
use App\Services\Billing\SubscriptionService;
use App\Services\Growth\ExecutiveService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/** Growth Network item 6 — Executive performance and payout dashboard. */
class ExecutiveDashboardTest extends TestCase
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

    protected function click(User $executive, ?User $registered = null, int $minutesAgo = 0): void
    {
        $referral = app(ExecutiveService::class)->ensureForUser($executive);

        ReferralClick::create([
            'executive_referral_id' => $referral->id,
            'user_id' => $registered?->id,
            'code' => $referral->code,
            'ip_hash' => hash('sha256', 'privacy-safe'),
            'user_agent' => 'PHPUnit',
            'referrer' => 'https://example.com',
            'created_at' => now()->subMinutes($minutesAgo),
        ]);
    }

    public function test_executive_dashboard_returns_referral_assets_and_performance(): void
    {
        [$executive, $member] = $this->referred();
        $this->click($executive, $member, 2);
        $this->click($executive, null, 1);
        $this->annualPurchase($member);

        auth()->forgetGuards();
        $response = $this->withToken($this->token($executive))
            ->getJson('/api/executive/dashboard')
            ->assertOk()
            ->json('dashboard');

        $this->assertNotEmpty($response['referral']['code']);
        $this->assertStringContainsString('/r/'.$response['referral']['code'], $response['referral']['url']);
        $this->assertStringContainsString($response['referral']['code'], $response['referral']['qr_url']);

        $this->assertSame(2, $response['summary']['clicks']);
        $this->assertSame(1, $response['summary']['registered_members']);
        $this->assertSame(1, $response['summary']['cleared_commissions_count']);
        $this->assertSame('100.00', $response['summary']['cleared_commissions_total']);
        $this->assertSame('100.00', $response['summary']['unbatched_amount']);
        $this->assertSame('0.00', $response['summary']['pending_approval_amount']);
        $this->assertSame('0.00', $response['summary']['approved_amount']);
        $this->assertSame('0.00', $response['summary']['paid_amount']);
        $this->assertSame('GHS', $response['summary']['currency']);

        $this->assertSame($member->id, $response['attributed_members'][0]['id']);
        $this->assertSame(Plan::ANNUAL, $response['attributed_members'][0]['plan']);
        $this->assertSame($member->id, $response['commissions'][0]['member']['id']);
        $this->assertSame('100.00', $response['commissions'][0]['amount']);
        $this->assertNull($response['commissions'][0]['payout']);
        $this->assertCount(2, $response['recent_clicks']);
        $this->assertArrayNotHasKey('ip_hash', $response['recent_clicks'][0]);

        $registeredIds = collect($response['recent_clicks'])
            ->pluck('registered_user.id')
            ->filter()
            ->values()
            ->all();
        $this->assertContains($member->id, $registeredIds);
    }

    public function test_executive_dashboard_shows_payout_history_after_payment(): void
    {
        [$executive, $member] = $this->referred();
        $this->annualPurchase($member);

        $this->withToken($this->asAdmin())
            ->postJson('/api/admin/payout/batches/generate')
            ->assertOk();

        $batch = PayoutBatch::firstOrFail();
        $item = $batch->items()->firstOrFail();

        $this->withToken($this->asAdmin())
            ->postJson("/api/admin/payout/batches/{$batch->id}/approve")
            ->assertOk();

        $this->withToken($this->asAdmin())
            ->patchJson(
                "/api/admin/payout/batches/{$batch->id}/items/{$item->id}/transfer-reference",
                ['transfer_reference' => 'TXN-DASH-001']
            )
            ->assertOk();

        $this->withToken($this->asAdmin())
            ->postJson("/api/admin/payout/batches/{$batch->id}/mark-paid")
            ->assertOk();

        auth()->forgetGuards();
        $dashboard = $this->withToken($this->token($executive))
            ->getJson('/api/executive/dashboard')
            ->assertOk()
            ->json('dashboard');

        $this->assertSame('0.00', $dashboard['summary']['unbatched_amount']);
        $this->assertSame('0.00', $dashboard['summary']['pending_approval_amount']);
        $this->assertSame('0.00', $dashboard['summary']['approved_amount']);
        $this->assertSame('100.00', $dashboard['summary']['paid_amount']);

        $this->assertCount(1, $dashboard['payouts']);
        $this->assertSame($batch->id, $dashboard['payouts'][0]['id']);
        $this->assertSame('100.00', $dashboard['payouts'][0]['amount']);
        $this->assertSame('paid', $dashboard['payouts'][0]['status']);
        $this->assertContains('TXN-DASH-001', $dashboard['payouts'][0]['transfer_references']);
        $this->assertNotNull($dashboard['payouts'][0]['paid_at']);

        $this->assertSame('paid', $dashboard['commissions'][0]['payout']['status']);
        $this->assertSame('TXN-DASH-001', $dashboard['commissions'][0]['payout']['transfer_reference']);
    }

    public function test_executive_dashboard_is_scoped_to_the_authenticated_executive(): void
    {
        [$executive, $member] = $this->referred();
        $this->annualPurchase($member);

        [, $otherMember] = $this->referred();
        $this->annualPurchase($otherMember);

        auth()->forgetGuards();
        $dashboard = $this->withToken($this->token($executive))
            ->getJson('/api/executive/dashboard')
            ->assertOk()
            ->json('dashboard');

        $this->assertSame(1, $dashboard['summary']['registered_members']);
        $this->assertSame(1, $dashboard['summary']['cleared_commissions_count']);
        $this->assertSame('100.00', $dashboard['summary']['cleared_commissions_total']);
        $this->assertCount(1, $dashboard['attributed_members']);
        $this->assertSame($member->id, $dashboard['attributed_members'][0]['id']);
        $this->assertCount(1, $dashboard['commissions']);
        $this->assertSame($member->id, $dashboard['commissions'][0]['member']['id']);
        $this->assertSame([], $dashboard['payouts']);
    }

    public function test_non_executive_cannot_view_the_dashboard(): void
    {
        $member = $this->member();

        $this->withToken($this->token($member))
            ->getJson('/api/executive/dashboard')
            ->assertStatus(403);
    }
}
