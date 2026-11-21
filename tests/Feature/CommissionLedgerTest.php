<?php

namespace Tests\Feature;

use App\Models\Commission;
use App\Models\DiscountCampaign;
use App\Models\Payment;
use App\Models\Plan;
use App\Models\User;
use App\Services\Billing\SubscriptionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Growth Network item 3 — cash commission ledger.
 *
 * Only a referred member's first annual purchase earns. Commissions clear
 * immediately and are reversed on refund or revoked membership.
 */
class CommissionLedgerTest extends TestCase
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

    protected function executive(): User
    {
        $user = $this->member();
        $user->profile()->create([]);

        app(SubscriptionService::class)
            ->grantPlan($user, Plan::EXECUTIVE, null, false, 'test_grant');

        return $user->fresh();
    }

    protected function startCheckout(User $user, string $plan, array $extra = []): Payment
    {
        $response = $this->withToken($this->token($user))
            ->withHeader('Idempotency-Key', 'key-' . uniqid())
            ->postJson('/api/payments/initiate', [
                'plan' => $plan,
                'method' => 'card',
                'amount' => 1,
                ...$extra,
            ]);

        $response->assertOk();

        return Payment::findOrFail($response->json('payment.id') ?? 0);
    }

    protected function confirmMock(User $user, Payment $payment): void
    {
        $this->withToken($this->token($user))
            ->postJson('/api/payments/mock/confirm', [
                'reference' => $payment->provider_reference,
            ])
            ->assertOk();
    }

    protected function attribute(User $member, User $executive, string $code): void
    {
        $member->forceFill([
            'referred_by_user_id' => $executive->id,
            'referred_by_code' => $code,
            'referred_at' => now(),
        ])->save();
    }

    protected function executiveCode(User $executive): string
    {
        return \App\Models\ExecutiveReferral::where('user_id', $executive->id)
            ->firstOrFail()
            ->code;
    }

    /** @return array{0: User, 1: User, 2: string} */
    protected function referred(string $campaignCode = ''): array
    {
        $executive = $this->executive();
        $code = $this->executiveCode($executive);
        $member = $this->member($campaignCode ? ['campaign_code' => $campaignCode] : []);
        $member->profile()->create([]);
        $this->attribute($member, $executive, $code);

        return [$executive, $member, $code];
    }

    public function test_first_annual_sale_earns_a_cleared_commission(): void
    {
        [$executive, $member, $code] = $this->referred();

        $payment = $this->startCheckout($member, Plan::ANNUAL);
        $this->confirmMock($member, $payment);

        $commission = Commission::firstOrFail();
        $this->assertSame($executive->id, $commission->executive_user_id);
        $this->assertSame($member->id, $commission->member_user_id);
        $this->assertSame($code, $commission->executiveReferral->code);
        $this->assertSame(Commission::TYPE_FIRST_ANNUAL, $commission->type);
        $this->assertSame('100.00', $commission->amount);
        $this->assertSame('350.00', $commission->collected_amount);
        $this->assertSame(Commission::STATUS_CLEARED, $commission->status);
        $this->assertNotNull($commission->cleared_at);
        $this->assertSame($payment->id, $commission->payment_id);
        $this->assertNotNull($commission->subscription_id);
    }

    public function test_monthly_sale_does_not_earn(): void
    {
        [, $member] = $this->referred();

        $payment = $this->startCheckout($member, Plan::MONTHLY);
        $this->confirmMock($member, $payment);

        $this->assertSame(0, Commission::count());
    }

    public function test_renewal_does_not_earn_a_second_commission(): void
    {
        [, $member] = $this->referred();

        $first = $this->startCheckout($member, Plan::ANNUAL);
        $this->confirmMock($member, $first);

        $renewal = $this->startCheckout($member, Plan::ANNUAL);
        $this->assertSame(Payment::PURPOSE_RENEWAL, $renewal->purpose);
        $this->confirmMock($member, $renewal);

        $this->assertSame(1, Commission::count());
    }

    public function test_monthly_to_annual_upgrade_earns_a_reduced_commission(): void
    {
        [, $member] = $this->referred();

        $monthly = $this->startCheckout($member, Plan::MONTHLY);
        $this->confirmMock($member, $monthly);

        $upgrade = $this->startCheckout($member, Plan::ANNUAL);
        $this->assertSame(Payment::PURPOSE_UPGRADE, $upgrade->purpose);
        $this->confirmMock($member, $upgrade);

        $commission = Commission::firstOrFail();
        $this->assertSame(Commission::TYPE_ANNUAL_UPGRADE, $commission->type);
        $this->assertSame('50.00', $commission->amount);
    }

    public function test_discounted_annual_sale_is_capped_at_thirty_percent_of_collected(): void
    {
        DiscountCampaign::create([
            'code' => 'PROMO',
            'name' => 'Promo',
            'amount' => 200,
            'is_active' => true,
        ]);

        [, $member] = $this->referred('PROMO');

        $payment = $this->startCheckout($member, Plan::ANNUAL);
        $this->assertSame('200.00', $payment->amount);
        $this->confirmMock($member, $payment);

        $commission = Commission::firstOrFail();
        $this->assertSame(Commission::TYPE_DISCOUNTED_ANNUAL, $commission->type);
        $this->assertSame('60.00', $commission->amount);
        $this->assertSame('200.00', $commission->collected_amount);
    }

    public function test_unattributed_member_does_not_earn(): void
    {
        $member = $this->member();
        $member->profile()->create([]);

        $payment = $this->startCheckout($member, Plan::ANNUAL);
        $this->confirmMock($member, $payment);

        $this->assertSame(0, Commission::count());
    }

    public function test_executive_without_commission_feature_does_not_earn(): void
    {
        [$executive, $member] = $this->referred();

        $plan = Plan::where('code', Plan::EXECUTIVE)->firstOrFail();
        $features = $plan->features ?? [];
        $features['earns_commission'] = false;
        $plan->forceFill(['features' => $features])->save();

        $payment = $this->startCheckout($member, Plan::ANNUAL);
        $this->confirmMock($member, $payment);

        $this->assertSame(0, Commission::count());
    }

    public function test_duplicate_confirmation_does_not_double_pay(): void
    {
        [, $member] = $this->referred();

        $payment = $this->startCheckout($member, Plan::ANNUAL);
        $this->confirmMock($member, $payment);
        $this->confirmMock($member, $payment->fresh());

        $this->assertSame(1, Commission::count());
    }

    public function test_refund_webhook_reverses_the_commission(): void
    {
        [, $member] = $this->referred();

        $payment = $this->startCheckout($member, Plan::ANNUAL);
        $this->confirmMock($member, $payment);

        $this->postJson('/api/payments/webhook/mock', [
            'event' => 'charge.refunded',
            'data' => ['reference' => $payment->provider_reference],
        ])->assertOk();

        $commission = Commission::firstOrFail();
        $this->assertSame(Commission::STATUS_CANCELLED, $commission->status);
        $this->assertSame('payment_refunded', $commission->cancellation_reason);
        $this->assertNotNull($commission->cancelled_at);
    }

    public function test_revoking_the_member_reverses_the_commission(): void
    {
        [, $member] = $this->referred();

        $payment = $this->startCheckout($member, Plan::ANNUAL);
        $this->confirmMock($member, $payment);

        $commission = Commission::firstOrFail();
        $subscription = $commission->subscription;

        auth()->forgetGuards();

        $this->withToken($this->token($this->admin()))
            ->deleteJson("/api/admin/users/{$member->id}/subscription")
            ->assertOk();

        $this->assertSame(Commission::STATUS_CANCELLED, $commission->fresh()->status);
        $this->assertSame('subscription_revoked', $commission->fresh()->cancellation_reason);
        $this->assertNotNull($subscription);
    }

    public function test_admin_can_list_and_filter_commissions(): void
    {
        [$executive, $member] = $this->referred();

        $payment = $this->startCheckout($member, Plan::ANNUAL);
        $this->confirmMock($member, $payment);

        $admin = $this->admin();
        auth()->forgetGuards();

        $response = $this->withToken($this->token($admin))
            ->getJson('/api/admin/commissions')
            ->assertOk();

        $this->assertCount(1, $response->json('data'));
        $this->assertSame($executive->id, $response->json('data.0.executive.id'));
        $this->assertSame($payment->provider_reference, $response->json('data.0.payment.reference'));

        $this->withToken($this->token($this->admin()))
            ->getJson('/api/admin/commissions?status=cancelled')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }
}
