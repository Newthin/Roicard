<?php

namespace Tests\Feature;

use App\Mail\MembershipLapsedMail;
use App\Mail\RenewalReminderMail;
use App\Models\Payment;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\SubscriptionEvent;
use App\Models\User;
use App\Services\Billing\EntitlementService;
use App\Services\Billing\SubscriptionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Phase 1 billing contract:
 *  - server-side pricing from the plan catalogue
 *  - plan activation and renewal periods
 *  - monthly -> annual upgrade credit
 *  - grace/expiry downgrade without deleting or hiding data
 *  - free-tier publication and limits
 *  - founding grandfathering for legacy one-time payers
 */
class SubscriptionBillingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['app.payment_provider' => 'mock']);
    }

    protected function member(array $attributes = []): User
    {
        return User::factory()->create([
            'status' => 'draft',
            'role' => 'member',
            ...$attributes,
        ]);
    }

    protected function token(User $user): string
    {
        return $user->createToken('test')->plainTextToken;
    }

    protected function startCheckout(User $user, string $plan, array $extra = []): Payment
    {
        $response = $this->withToken($this->token($user))
            ->withHeader('Idempotency-Key', 'key-' . uniqid())
            ->postJson('/api/payments/initiate', [
                'plan' => $plan,
                'method' => 'card',
                // Deliberately wrong: the server must ignore it.
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

    public function test_public_plan_catalogue_exposes_server_prices(): void
    {
        $response = $this->getJson('/api/plans')->assertOk();

        $response->assertJsonPath('currency', 'GHS');
        $response->assertJsonFragment(['code' => Plan::ANNUAL]);
        $response->assertJsonFragment(['code' => Plan::MONTHLY]);

        $annual = collect($response->json('plans'))->firstWhere('code', 'annual');
        $this->assertSame(350, $annual['initial_price']);
        $this->assertSame(250, $annual['price']);
        $this->assertTrue($annual['includes_card']);
    }

    public function test_checkout_ignores_client_amount_and_uses_server_price(): void
    {
        $user = $this->member();
        $user->profile()->create([]);

        $payment = $this->startCheckout($user, Plan::ANNUAL);

        $this->assertSame('350.00', $payment->amount);
        $this->assertSame(Plan::ANNUAL, $payment->plan?->code);
        $this->assertSame(Payment::PURPOSE_INITIAL, $payment->purpose);
        $this->assertNotNull($payment->period_end);
        $this->assertSame('pending', $payment->status);
    }

    public function test_successful_checkout_activates_and_publishes_membership(): void
    {
        Mail::fake();

        $user = $this->member();
        $user->profile()->create([]);

        $payment = $this->startCheckout($user, Plan::ANNUAL);
        $this->confirmMock($user, $payment);

        $user->refresh();

        $this->assertSame('success', $payment->fresh()->status);
        $this->assertSame('active', $user->status);
        $this->assertTrue((bool) $user->profile->fresh()->is_live);
        $this->assertNotNull($user->onboarding_completed_at);

        $subscription = $user->subscription()->with('plan')->firstOrFail();
        $this->assertSame(Subscription::STATUS_ACTIVE, $subscription->status);
        $this->assertSame(Plan::ANNUAL, $subscription->plan->code);
        $this->assertTrue($subscription->current_period_end->isFuture());

        $this->assertDatabaseHas('subscription_events', [
            'user_id' => $user->id,
            'type' => 'activated',
        ]);
    }

    public function test_monthly_to_annual_upgrade_applies_unused_credit(): void
    {
        Mail::fake();

        $user = $this->member();
        $user->profile()->create([]);

        $monthly = $this->startCheckout($user, Plan::MONTHLY);
        $this->assertSame('80.00', $monthly->amount);
        $this->confirmMock($user, $monthly);

        $quote = $this->withToken($this->token($user))
            ->postJson('/api/billing/quote', ['plan' => Plan::ANNUAL])
            ->assertOk()
            ->json('quote');

        $this->assertSame('upgrade', $quote['purpose']);
        $this->assertGreaterThan(0, $quote['credit_applied']);
        $this->assertLessThan(350, $quote['amount']);
        $this->assertSame(250, $quote['recurring_price']);

        $upgrade = $this->startCheckout($user, Plan::ANNUAL);
        $this->assertSame(Payment::PURPOSE_UPGRADE, $upgrade->purpose);
        $this->confirmMock($user, $upgrade);

        $subscription = $user->subscription()->with('plan')->firstOrFail();
        $this->assertSame(Plan::ANNUAL, $subscription->plan->code);
        $this->assertSame(Subscription::STATUS_ACTIVE, $subscription->status);
    }

    public function test_cancellation_keeps_access_until_period_end(): void
    {
        Mail::fake();

        $user = $this->member();
        $user->profile()->create([]);
        $payment = $this->startCheckout($user, Plan::ANNUAL);
        $this->confirmMock($user, $payment);

        $response = $this->withToken($this->token($user))
            ->postJson('/api/billing/cancel')
            ->assertOk();

        $response->assertJsonPath('membership.cancel_at_period_end', true);
        $response->assertJsonPath('membership.is_active', true);

        $this->assertTrue($user->subscription->fresh()->cancel_at_period_end);
    }

    public function test_expiry_downgrades_to_free_and_keeps_profile_live(): void
    {
        Mail::fake();

        $user = $this->member(['status' => 'active', 'onboarding_completed_at' => now()]);
        $user->profile()->create(['slug' => 'free-downgrade', 'is_live' => true]);

        $plan = Plan::where('code', Plan::MONTHLY)->firstOrFail();
        $subscription = Subscription::create([
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'status' => Subscription::STATUS_ACTIVE,
            'started_at' => now()->subMonth(),
            'current_period_start' => now()->subMonth(),
            'current_period_end' => now()->subDay(),
        ]);

        $this->artisan('billing:sync-lifecycle')->assertSuccessful();

        $subscription->refresh();
        $this->assertSame(Subscription::STATUS_GRACE, $subscription->status);
        $this->assertNotNull($subscription->grace_ends_at);

        // Fast-forward past the grace window.
        $subscription->forceFill(['grace_ends_at' => now()->subMinute()])->save();
        $this->artisan('billing:sync-lifecycle')->assertSuccessful();

        $subscription->refresh();
        $this->assertSame(Subscription::STATUS_EXPIRED, $subscription->status);

        $user->refresh();
        $this->assertTrue((bool) $user->profile->fresh()->is_live);
        $this->assertSame(Plan::FREE, app(EntitlementService::class)->planFor($user)->code);
        $this->assertSame('active', $user->status);

        Mail::assertQueued(MembershipLapsedMail::class);
    }

    public function test_renewal_reminder_is_sent_once_per_period(): void
    {
        Mail::fake();

        $user = $this->member(['status' => 'active', 'onboarding_completed_at' => now()]);
        $user->profile()->create([]);

        $plan = Plan::where('code', Plan::MONTHLY)->firstOrFail();
        Subscription::create([
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'status' => Subscription::STATUS_ACTIVE,
            'started_at' => now(),
            'current_period_start' => now(),
            'current_period_end' => now()->addDays(7),
        ]);

        $this->artisan('billing:renewals')->assertSuccessful();
        $this->artisan('billing:renewals')->assertSuccessful();

        Mail::assertQueued(RenewalReminderMail::class, 1);
        $this->assertSame(
            1,
            SubscriptionEvent::where('user_id', $user->id)->where('type', 'renewal_reminder')->count()
        );
    }

    public function test_free_plan_publishes_profile_and_unlocks_public_view(): void
    {
        $user = $this->member();
        $user->profile()->create(['slug' => 'free-member']);

        $this->withToken($this->token($user))
            ->postJson('/api/profile/complete', [])
            ->assertOk()
            ->assertJsonPath('user.membership_status', 'free');

        $user->refresh();
        $this->assertTrue((bool) $user->profile->fresh()->is_live);
        $this->assertSame('draft', $user->status);
        $this->assertNull($user->draftClosesAt());

        $this->getJson('/api/public/free-member')
            ->assertOk()
            ->assertJsonPath('slug', 'free-member');
    }

    public function test_free_plan_enforces_education_limit(): void
    {
        $user = $this->member();
        $profile = $user->profile()->create([]);

        foreach (range(1, 3) as $index) {
            $profile->education()->create([
                'institution' => "Institution {$index}",
                'degree' => 'BSc',
                'start_year' => 2018,
                'end_year' => 2022,
            ]);
        }

        $this->withToken($this->token($user))
            ->postJson('/api/profile/education', [
                'institution' => 'Fourth Institution',
                'degree' => 'MSc',
                'start_year' => 2022,
                'end_year' => 2024,
            ])
            ->assertStatus(403)
            ->assertJsonPath('error', 'plan_limit_reached')
            ->assertJsonPath('limit_key', 'cv_entries');
    }

    public function test_legacy_active_member_is_grandfathered_as_founding(): void
    {
        $user = $this->member(['status' => 'active', 'onboarding_completed_at' => now()]);
        $user->profile()->create([]);

        $this->withToken($this->token($user))
            ->withHeader('Idempotency-Key', 'legacy-' . uniqid())
            ->postJson('/api/payments/initiate', ['plan' => Plan::ANNUAL])
            ->assertStatus(422)
            ->assertJsonPath('error', 'already_founding');

        // The backfill is idempotent and grants lifetime access.
        $this->artisan('billing:backfill')->assertSuccessful();

        $subscription = $user->subscription()->with('plan')->firstOrFail();
        $this->assertSame(Subscription::STATUS_FOUNDING, $subscription->status);
        $this->assertSame(Plan::FOUNDING, $subscription->plan->code);
        $this->assertNull($subscription->current_period_end);
        $this->assertTrue($user->fresh()->isFoundingMember());
    }

    public function test_admin_activation_grants_founding_without_a_payment(): void
    {
        $admin = User::factory()->create(['status' => 'active', 'role' => 'admin']);
        $target = $this->member();
        $target->profile()->create(['title' => 'Designer']);

        $this->withToken($this->token($admin))
            ->patchJson("/api/admin/users/{$target->id}", ['status' => 'active'])
            ->assertOk();

        $target->refresh();

        $this->assertSame('active', $target->status);
        $this->assertTrue((bool) $target->profile->fresh()->is_live);
        $this->assertSame(Subscription::STATUS_FOUNDING, $target->subscription->status);
        $this->assertSame(0, Payment::where('user_id', $target->id)->count());
    }

    public function test_admin_can_update_plan_prices(): void
    {
        $admin = User::factory()->create(['status' => 'active', 'role' => 'admin']);

        $this->withToken($this->token($admin))
            ->patchJson('/api/admin/plans/annual', [
                'initial_price' => 400,
                'price' => 275,
            ])
            ->assertOk();

        $this->assertDatabaseHas('plans', [
            'code' => Plan::ANNUAL,
            'initial_price' => 400,
            'price' => 275,
        ]);
    }

    public function test_founding_member_cannot_be_charged_again(): void
    {
        $user = $this->member(['status' => 'active']);
        $user->profile()->create([]);

        app(SubscriptionService::class)->grantFounding($user, 'test', false);

        $this->withToken($this->token($user))
            ->withHeader('Idempotency-Key', 'founding-' . uniqid())
            ->postJson('/api/payments/initiate', ['plan' => Plan::ANNUAL])
            ->assertStatus(422)
            ->assertJsonPath('error', 'already_founding');
    }
}
