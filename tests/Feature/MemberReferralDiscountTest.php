<?php

namespace Tests\Feature;

use App\Models\Commission;
use App\Models\DiscountCampaign;
use App\Models\ExecutiveReferral;
use App\Models\MemberReferralCredit;
use App\Models\Payment;
use App\Models\Plan;
use App\Models\User;
use App\Services\Billing\SubscriptionService;
use App\Services\Growth\MemberReferralCreditService;
use App\Services\Growth\ReferralAttributionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/** Normal-user referral discounts: attribution, pricing, credits and reversals. */
class MemberReferralDiscountTest extends TestCase
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

    protected function referrer(array $attributes = []): User
    {
        $user = $this->member($attributes);
        $user->profile()->create(['is_live' => true]);

        return $user;
    }

    protected function token(User $user): string
    {
        auth()->forgetGuards();

        return $user->createToken('test')->plainTextToken;
    }

    protected function codeFor(User $user): string
    {
        return $this->withToken($this->token($user))
            ->getJson('/api/referrals/me')
            ->assertOk()
            ->json('referral.code');
    }

    protected function withReferralCookie(string $code): static
    {
        return $this->withCredentials()->withUnencryptedCookies([
            ReferralAttributionService::COOKIE_NAME => $code,
        ]);
    }

    /** @param array<string, mixed> $extra */
    protected function registerReferred(string $code, string $email, array $extra = []): User
    {
        $this->postJson("/api/referrals/{$code}/click")->assertNoContent();

        $this->withReferralCookie($code)
            ->postJson('/api/auth/register', [
                'first_name' => 'Referred',
                'last_name' => 'Member',
                'email' => $email,
                'password' => 'Password123!',
                'password_confirmation' => 'Password123!',
                ...$extra,
            ])
            ->assertCreated();

        return User::where('email', $email)->firstOrFail();
    }

    protected function purchase(User $user, string $plan = Plan::ANNUAL): Payment
    {
        $response = $this->withToken($this->token($user))
            ->withHeader('Idempotency-Key', 'member-ref-'.uniqid())
            ->postJson('/api/payments/initiate', [
                'plan' => $plan,
                'method' => 'card',
                'amount' => 1,
            ]);

        $response->assertOk();
        $payment = Payment::findOrFail($response->json('payment.id'));

        $this->withToken($this->token($user))
            ->postJson('/api/payments/mock/confirm', [
                'reference' => $payment->provider_reference,
            ])
            ->assertOk();

        return $payment->fresh();
    }

    /** @return array<string, mixed> */
    protected function quote(User $user, string $plan = Plan::ANNUAL): array
    {
        return $this->withToken($this->token($user))
            ->postJson('/api/billing/quote', ['plan' => $plan])
            ->assertOk()
            ->json('quote');
    }

    /** @return array<string, mixed> */
    protected function dashboard(User $user): array
    {
        return $this->withToken($this->token($user))
            ->getJson('/api/referrals/dashboard')
            ->assertOk()
            ->json('dashboard');
    }

    public function test_verified_member_gets_referral_assets_and_click_attribution(): void
    {
        $referrer = $this->referrer();
        $code = $this->codeFor($referrer);

        $this->assertNotEmpty($code);
        $this->assertStringContainsString('/r/'.$code, $this->withToken($this->token($referrer))
            ->getJson('/api/referrals/me')->json('referral.url'));

        $member = $this->registerReferred($code, 'attributed@example.com');

        $this->assertSame($referrer->id, $member->referred_by_user_id);
        $this->assertSame($code, $member->referred_by_code);

        $dashboard = $this->dashboard($referrer);
        $this->assertSame($code, $dashboard['referral']['code']);
        $this->assertSame(1, $dashboard['summary']['clicks']);
        $this->assertSame(1, $dashboard['summary']['registered_members']);
        $this->assertSame($member->id, $dashboard['attributed_members'][0]['id']);
        $this->assertArrayNotHasKey('ip_hash', $dashboard['recent_clicks'][0] ?? []);
    }

    public function test_first_purchase_gets_three_percent_discount_and_earns_equal_credit(): void
    {
        $referrer = $this->referrer();
        $code = $this->codeFor($referrer);
        $member = $this->registerReferred($code, 'discount@example.com');

        $quote = $this->quote($member);
        $this->assertSame('339.50', number_format((float) $quote['amount'], 2, '.', ''));
        $this->assertSame('10.50', number_format((float) $quote['discount_amount'], 2, '.', ''));
        $this->assertSame($referrer->id, $quote['referral_discount']['user_id']);
        $this->assertSame('10.50', number_format((float) $quote['referral_discount']['amount'], 2, '.', ''));

        $payment = $this->purchase($member);
        $this->assertSame('339.50', number_format((float) $payment->amount, 2, '.', ''));
        $this->assertSame('10.50', number_format((float) $payment->referral_discount_amount, 2, '.', ''));
        $this->assertSame($referrer->id, $payment->referral_user_id);

        $dashboard = $this->dashboard($referrer);
        $this->assertSame('10.50', $dashboard['summary']['credits_earned']);
        $this->assertSame('10.50', $dashboard['summary']['available_balance']);
        $this->assertSame('0.00', $dashboard['summary']['credits_used']);
        $this->assertCount(1, $dashboard['credits']);
        $this->assertSame('10.50', $dashboard['credits'][0]['amount']);

        // Renewals are never discounted and never earn a second credit.
        $renewal = $this->quote($member);
        $this->assertNull($renewal['referral_discount']);
        $this->assertSame('250.00', number_format((float) $renewal['amount'], 2, '.', ''));
        $this->purchase($member);
        $this->assertSame('10.50', $this->dashboard($referrer)['summary']['credits_earned']);
    }

    public function test_discount_is_capped_at_ghs_fifty(): void
    {
        // At 3% the GHS 50 cap only binds above GHS 1,666.67, so use a high
        // test price to keep the cap itself covered.
        Plan::where('code', Plan::ANNUAL)->update(['initial_price' => 2000]);

        $referrer = $this->referrer();
        $member = $this->registerReferred($this->codeFor($referrer), 'capped@example.com');

        $quote = $this->quote($member);
        $this->assertSame('50.00', number_format((float) $quote['referral_discount']['amount'], 2, '.', ''));
        $this->assertSame('1950.00', number_format((float) $quote['amount'], 2, '.', ''));

        $payment = $this->purchase($member);
        $this->assertSame('50.00', number_format((float) $payment->referral_discount_amount, 2, '.', ''));
        $this->assertSame('50.00', $this->dashboard($referrer)['summary']['available_balance']);
    }

    public function test_campaign_discount_and_referral_discount_never_stack(): void
    {
        DiscountCampaign::create([
            'code' => 'NLFTEST',
            'name' => 'Test campaign',
            'amount' => 175,
            'starts_at' => now()->subDay(),
            'expires_at' => now()->addDay(),
            'is_active' => true,
        ]);

        $referrer = $this->referrer();
        $member = $this->registerReferred(
            $this->codeFor($referrer),
            'campaign@example.com',
            ['campaign_code' => 'NLFTEST']
        );

        $quote = $this->quote($member);
        $this->assertNotNull($quote['campaign'], 'Campaign should be attached to the member');
        $this->assertSame('NLFTEST', $quote['campaign']['code']);
        $this->assertNull($quote['referral_discount']);
        $this->assertSame('175.00', number_format((float) $quote['amount'], 2, '.', ''));

        $this->purchase($member);
        $this->assertSame('0.00', $this->dashboard($referrer)['summary']['credits_earned']);
    }

    public function test_credit_is_applied_automatically_at_referrers_next_checkout(): void
    {
        $referrer = $this->referrer();
        $member = $this->registerReferred($this->codeFor($referrer), 'credit@example.com');
        $this->purchase($member);

        $quote = $this->quote($referrer, Plan::MONTHLY);
        $this->assertSame('10.50', number_format((float) $quote['referral_credit_applied'], 2, '.', ''));
        $this->assertSame('69.50', number_format((float) $quote['amount'], 2, '.', ''));

        $payment = $this->purchase($referrer, Plan::MONTHLY);
        $this->assertSame('10.50', number_format((float) $payment->referral_credit_applied, 2, '.', ''));
        $this->assertSame('69.50', number_format((float) $payment->amount, 2, '.', ''));

        $dashboard = $this->dashboard($referrer);
        $this->assertSame('10.50', $dashboard['summary']['credits_used']);
        $this->assertSame('0.00', $dashboard['summary']['available_balance']);

        $credit = MemberReferralCredit::where('earned_from_payment_id', $payment->id)->first();
        $this->assertNull($credit); // this payment consumed credit; it did not earn any
    }

    public function test_refund_of_earning_payment_cancels_credit_or_posts_negative_adjustment(): void
    {
        $referrer = $this->referrer();
        $member = $this->registerReferred($this->codeFor($referrer), 'refund@example.com');
        $earningPayment = $this->purchase($member);

        $this->postJson('/api/payments/webhook/mock', [
            'event' => 'charge.refunded',
            'data' => ['reference' => $earningPayment->provider_reference],
        ])->assertOk();

        $credit = MemberReferralCredit::where('earned_from_payment_id', $earningPayment->id)->firstOrFail();
        $this->assertSame(MemberReferralCredit::STATUS_CANCELLED, $credit->status);
        $this->assertSame('0.00', $this->dashboard($referrer)['summary']['available_balance']);

        // A credit already spent cannot simply disappear; a negative movement
        // keeps the ledger balanced.
        $referrer->forceFill(['email_verified_at' => now()])->save();
        $secondReferrer = $this->referrer();
        $secondMember = $this->registerReferred($this->codeFor($secondReferrer), 'refund-spent@example.com');
        $secondPayment = $this->purchase($secondMember);
        $this->purchase($secondReferrer, Plan::MONTHLY);

        $secondCredit = MemberReferralCredit::where('earned_from_payment_id', $secondPayment->id)->firstOrFail();
        $this->assertSame(MemberReferralCredit::STATUS_USED, $secondCredit->status);

        $this->postJson('/api/payments/webhook/mock', [
            'event' => 'charge.refunded',
            'data' => ['reference' => $secondPayment->provider_reference],
        ])->assertOk();

        $this->assertSame(MemberReferralCredit::STATUS_CANCELLED, $secondCredit->fresh()->status);
        $this->assertTrue(MemberReferralCredit::where('user_id', $secondReferrer->id)
            ->where('status', MemberReferralCredit::STATUS_ADJUSTMENT)
            ->where('amount', -10.5)
            ->exists());
    }

    public function test_refund_of_spending_payment_restores_unexpired_credit(): void
    {
        $referrer = $this->referrer();
        $member = $this->registerReferred($this->codeFor($referrer), 'restore@example.com');
        $this->purchase($member);
        $spendingPayment = $this->purchase($referrer, Plan::MONTHLY);

        $this->postJson('/api/payments/webhook/mock', [
            'event' => 'charge.refunded',
            'data' => ['reference' => $spendingPayment->provider_reference],
        ])->assertOk();

        $this->assertSame('10.50', $this->dashboard($referrer)['summary']['available_balance']);
    }

    public function test_executive_link_keeps_cash_commission_and_never_creates_member_discount(): void
    {
        $executive = User::factory()->create(['status' => 'active', 'role' => 'admin']);
        app(SubscriptionService::class)
            ->grantPlan($executive, Plan::EXECUTIVE, null, false, 'test_grant');

        $code = ExecutiveReferral::where('user_id', $executive->id)->firstOrFail()->code;
        $member = $this->registerReferred($code, 'executive-link@example.com');

        $this->assertSame($executive->id, $member->referred_by_user_id);

        $quote = $this->quote($member);
        $this->assertNull($quote['referral_discount']);
        $this->assertSame('350.00', number_format((float) $quote['amount'], 2, '.', ''));

        $payment = $this->purchase($member);

        $this->assertTrue(Commission::where('payment_id', $payment->id)
            ->where('executive_user_id', $executive->id)
            ->exists());
        $this->assertFalse(MemberReferralCredit::where('user_id', $executive->id)->exists());
    }

    public function test_unverified_deactivated_and_self_referrals_are_blocked(): void
    {
        $referrer = $this->referrer();
        $code = $this->codeFor($referrer);

        $referrer->update(['email_verified_at' => null]);
        $this->withToken($this->token($referrer->fresh()))
            ->getJson('/api/referrals/me')
            ->assertStatus(403);
        $this->postJson("/api/referrals/{$code}/click")->assertNotFound();

        $referrer->update(['email_verified_at' => now(), 'deactivated_at' => now()]);
        $this->postJson("/api/referrals/{$code}/click")->assertNotFound();

        $activeReferrer = $this->referrer();
        $activeCode = $this->codeFor($activeReferrer);
        $self = new User([
            'first_name' => 'Same',
            'last_name' => 'Person',
            'email' => $activeReferrer->email,
            'password' => 'password',
        ]);

        $request = Request::create('/');
        $request->cookies->set(ReferralAttributionService::COOKIE_NAME, $activeCode);

        $this->assertNull(app(ReferralAttributionService::class)->attributeRegistration($self, $request));

        $this->assertSame(0.0, app(MemberReferralCreditService::class)->availableBalance($activeReferrer));
    }
}
