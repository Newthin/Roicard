<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\Subscription;
use App\Models\User;
use App\Services\Billing\EntitlementService;
use App\Services\Billing\SubscriptionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Internal executive/staff roles:
 *  - seeded as permanent, admin-only, full-benefit plans
 *  - excluded from pricing, quotes and checkout
 *  - grantable through the existing admin billing endpoint
 *  - never renewed, charged, expired or cancelled
 *  - automatically applied to admin accounts for entitlements
 */
class InternalPlansTest extends TestCase
{
    use RefreshDatabase;

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

    public function test_internal_plans_are_seeded_with_full_paid_benefits(): void
    {
        foreach ([Plan::EXECUTIVE, Plan::STAFF] as $code) {
            $plan = Plan::where('code', $code)->firstOrFail();

            $this->assertFalse($plan->is_public);
            $this->assertTrue($plan->is_active);
            $this->assertTrue($plan->isInternal());
            $this->assertTrue($plan->isLifetime());
            $this->assertSame('none', $plan->interval);
            $this->assertEquals(0, $plan->initial_price);
            $this->assertEquals(0, $plan->price);
            $this->assertTrue($plan->includes_card);
            $this->assertSame(
                $code === Plan::EXECUTIVE,
                $plan->earnsCommission(),
                "Unexpected commission eligibility for {$code}"
            );

            foreach ([
                'meetings', 'full_analytics', 'ai_enrichment',
                'branding', 'export', 'priority_support', 'card',
            ] as $feature) {
                $this->assertTrue((bool) $plan->feature($feature), "{$code} is missing {$feature}");
            }

            $this->assertNull($plan->feature('cv_entries'));
            $this->assertNull($plan->feature('experience_entries'));
        }
    }

    public function test_only_executive_is_commission_eligible_for_now(): void
    {
        $this->assertTrue(Plan::where('code', Plan::EXECUTIVE)->firstOrFail()->earnsCommission());
        $this->assertFalse(Plan::where('code', Plan::STAFF)->firstOrFail()->earnsCommission());

        $user = $this->member();
        $user->profile()->create([]);
        app(SubscriptionService::class)->grantPlan($user, Plan::STAFF, null, false, 'test_grant');

        $this->assertFalse(app(EntitlementService::class)
            ->allows($user->fresh(), 'earns_commission'));
    }

    public function test_internal_plans_are_excluded_from_public_and_purchasable_catalogues(): void
    {
        $public = collect($this->getJson('/api/plans')->assertOk()->json('plans'))
            ->pluck('code')->all();

        $this->assertNotContains(Plan::EXECUTIVE, $public);
        $this->assertNotContains(Plan::STAFF, $public);
        $this->assertNotContains(Plan::EXECUTIVE, Plan::purchasable()->pluck('code')->all());
        $this->assertNotContains(Plan::STAFF, Plan::purchasable()->pluck('code')->all());
    }

    public function test_admin_catalogue_still_lists_internal_plans(): void
    {
        $admin = $this->admin();

        $codes = collect($this->withToken($this->token($admin))
            ->getJson('/api/admin/plans')->assertOk()->json('plans'))
            ->pluck('code')->all();

        $this->assertContains(Plan::EXECUTIVE, $codes);
        $this->assertContains(Plan::STAFF, $codes);
    }

    public function test_internal_plans_cannot_be_quoted_or_checked_out(): void
    {
        $user = $this->member();
        $user->profile()->create([]);

        foreach ([Plan::EXECUTIVE, Plan::STAFF] as $code) {
            $this->withToken($this->token($user))
                ->postJson('/api/billing/quote', ['plan' => $code])
                ->assertStatus(422)
                ->assertJsonPath('error', 'plan_not_purchasable');

            $this->withToken($this->token($user))
                ->withHeader('Idempotency-Key', 'internal-' . $code . '-' . uniqid())
                ->postJson('/api/payments/initiate', ['plan' => $code])
                ->assertStatus(422)
                ->assertJsonPath('error', 'plan_not_purchasable');
        }

        $this->assertSame(0, $user->payments()->count());
    }

    public function test_admin_can_grant_staff_plan_as_permanent_full_access(): void
    {
        $admin = $this->admin();
        $user = $this->member();
        $user->profile()->create([]);

        $this->withToken($this->token($admin))
            ->postJson("/api/admin/users/{$user->id}/subscription", ['plan' => Plan::STAFF])
            ->assertOk()
            ->assertJsonPath('subscription.plan', Plan::STAFF);

        $subscription = $user->fresh()->subscription()->with('plan')->firstOrFail();
        $this->assertSame(Subscription::STATUS_ACTIVE, $subscription->status);
        $this->assertNull($subscription->current_period_end);
        $this->assertTrue($subscription->isInternal());
        $this->assertTrue($subscription->isLifetime());
        $this->assertTrue($subscription->plan->includes_card);

        $entitlements = app(EntitlementService::class)->summary($user->fresh());
        $this->assertSame(Plan::STAFF, $entitlements['plan']);
        $this->assertTrue($entitlements['is_active']);
        $this->assertTrue($entitlements['is_internal']);
        $this->assertFalse($entitlements['is_founding']);
        $this->assertTrue((bool) $entitlements['features']['meetings']);
        $this->assertNull($entitlements['limits']['cv_entries']);
    }

    public function test_admin_can_grant_executive_plan_with_commission_eligibility(): void
    {
        $admin = $this->admin();
        $user = $this->member();
        $user->profile()->create([]);

        $this->withToken($this->token($admin))
            ->postJson("/api/admin/users/{$user->id}/subscription", ['plan' => Plan::EXECUTIVE])
            ->assertOk()
            ->assertJsonPath('subscription.plan', Plan::EXECUTIVE);

        $plan = $user->fresh()->subscription()->firstOrFail()->plan;
        $this->assertSame(Plan::EXECUTIVE, $plan->code);
        $this->assertTrue($plan->earnsCommission());
        $this->assertTrue((bool) app(EntitlementService::class)
            ->allows($user->fresh(), 'earns_commission'));
    }

    public function test_granting_internal_plan_ignores_an_admin_supplied_end_date(): void
    {
        $user = $this->member();
        $user->profile()->create([]);

        app(SubscriptionService::class)->grantPlan(
            $user,
            Plan::STAFF,
            now()->addDays(30),
            false,
            'test_grant'
        );

        $subscription = $user->fresh()->subscription()->firstOrFail();
        $this->assertNull($subscription->current_period_end);
        $this->assertSame(Subscription::STATUS_ACTIVE, $subscription->status);
    }

    public function test_internal_role_holder_cannot_cancel(): void
    {
        $user = $this->member();
        $user->profile()->create([]);
        app(SubscriptionService::class)->grantPlan($user, Plan::STAFF, null, false, 'test_grant');

        $this->withToken($this->token($user))
            ->postJson('/api/billing/cancel')
            ->assertStatus(422);

        $subscription = $user->fresh()->subscription()->firstOrFail();
        $this->assertSame(Subscription::STATUS_ACTIVE, $subscription->status);
        $this->assertFalse($subscription->cancel_at_period_end);
    }

    public function test_internal_role_survives_lifecycle_sync_and_is_never_due_for_charge(): void
    {
        $user = $this->member();
        $user->profile()->create([]);
        app(SubscriptionService::class)->grantPlan($user, Plan::STAFF, null, false, 'test_grant');

        $subscription = $user->fresh()->subscription()->firstOrFail();
        $service = app(SubscriptionService::class);

        $this->assertSame(['grace' => 0, 'expired' => 0], $service->syncLifecycle());
        $this->assertFalse($service->dueForCharge()->contains(
            fn (Subscription $candidate) => $candidate->id === $subscription->id
        ));

        $subscription->refresh();
        $this->assertSame(Subscription::STATUS_ACTIVE, $subscription->status);
        $this->assertSame('active', $user->fresh()->status);
    }

    public function test_summary_reports_internal_plan_without_a_renewal_date(): void
    {
        $user = $this->member();
        $user->profile()->create([]);
        app(SubscriptionService::class)->grantPlan($user, Plan::STAFF, null, false, 'test_grant');

        $response = $this->withToken($this->token($user))
            ->getJson('/api/billing')->assertOk();

        $response->assertJsonPath('membership.plan', Plan::STAFF)
            ->assertJsonPath('membership.is_internal', true)
            ->assertJsonPath('membership.renews_at', null)
            ->assertJsonPath('membership.current_period_end', null);
    }

    public function test_admin_accounts_get_staff_entitlements_without_a_subscription(): void
    {
        $admin = $this->admin();

        $this->assertNull($admin->subscription);

        $entitlements = app(EntitlementService::class)->summary($admin);
        $this->assertSame(Plan::STAFF, $entitlements['plan']);
        $this->assertTrue($entitlements['is_active']);
        $this->assertTrue($entitlements['is_internal']);
        $this->assertFalse($entitlements['is_founding']);

        $this->withToken($this->token($admin))
            ->getJson('/api/billing')->assertOk()
            ->assertJsonPath('membership.plan', Plan::STAFF)
            ->assertJsonPath('membership.status', Subscription::STATUS_ACTIVE)
            ->assertJsonPath('membership.is_active', true);
    }

    public function test_admin_can_revoke_an_internal_plan(): void
    {
        $admin = $this->admin();
        $user = $this->member();
        $user->profile()->create([]);
        app(SubscriptionService::class)->grantPlan($user, Plan::EXECUTIVE, null, false, 'test_grant');

        $this->withToken($this->token($admin))
            ->deleteJson("/api/admin/users/{$user->id}/subscription")
            ->assertOk()
            ->assertJsonPath('membership.plan', Plan::FREE);

        $this->assertSame(Subscription::STATUS_CANCELED, $user->fresh()->subscription->status);
    }
}
