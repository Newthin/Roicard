<?php

namespace Tests\Feature;

use App\Models\ExecutiveReferral;
use App\Models\Plan;
use App\Models\User;
use App\Services\Billing\EntitlementService;
use App\Services\Growth\ExecutiveService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Growth Network item 1 — Executive identity and referral assets.
 *
 * Executive status comes from the plan grant. This suite covers the stable
 * code, short link, QR asset and admin directory. Click tracking is not part
 * of this item and is intentionally untested here.
 */
class ExecutiveReferralTest extends TestCase
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

    public function test_granting_executive_creates_a_stable_referral_identity(): void
    {
        $user = $this->member();
        $user->profile()->create([]);

        $this->withToken($this->token($this->admin()))
            ->postJson("/api/admin/users/{$user->id}/subscription", ['plan' => Plan::EXECUTIVE])
            ->assertOk()
            ->assertJsonPath('subscription.plan', Plan::EXECUTIVE);

        $referral = ExecutiveReferral::where('user_id', $user->id)->firstOrFail();

        $this->assertMatchesRegularExpression(ExecutiveReferral::CODE_PATTERN, $referral->code);
        $this->assertStringContainsString('/r/' . $referral->code . '/', app(ExecutiveService::class)->link($referral->code));
        $this->assertStringContainsString('/api/referrals/' . $referral->code . '/qr', app(ExecutiveService::class)->qrUrl($referral->code));

        // Re-reading must reuse the same code.
        $this->assertSame(
            $referral->code,
            app(ExecutiveService::class)->ensureForUser($user->fresh())->code
        );
    }

    public function test_executive_can_read_own_referral_assets(): void
    {
        $user = $this->member();
        $user->profile()->create([]);
        app(\App\Services\Billing\SubscriptionService::class)
            ->grantPlan($user, Plan::EXECUTIVE, null, false, 'test_grant');

        $response = $this->withToken($this->token($user))
            ->getJson('/api/executive/referral')
            ->assertOk();

        $response->assertJsonPath('referral.user_id', $user->id);
        $this->assertMatchesRegularExpression(
            ExecutiveReferral::CODE_PATTERN,
            $response->json('referral.code')
        );
        $this->assertNotNull($response->json('referral.qr_url'));
    }

    public function test_non_executive_cannot_read_referral_assets(): void
    {
        $this->withToken($this->token($this->member()))
            ->getJson('/api/executive/referral')
            ->assertForbidden();
    }

    public function test_admin_can_list_and_view_executives_only(): void
    {
        $admin = $this->admin();
        $executive = $this->member();
        $other = $this->member();
        $staff = $this->member();
        $executive->profile()->create([]);
        $other->profile()->create([]);
        $staff->profile()->create([]);

        $subscriptions = app(\App\Services\Billing\SubscriptionService::class);
        $subscriptions->grantPlan($executive, Plan::EXECUTIVE, null, false, 'test_grant');
        $subscriptions->grantPlan($other, Plan::EXECUTIVE, null, false, 'test_grant');
        $subscriptions->grantPlan($staff, Plan::STAFF, null, false, 'test_grant');

        $list = $this->withToken($this->token($admin))
            ->getJson('/api/admin/executives')
            ->assertOk()
            ->json('executives');

        $this->assertCount(2, $list);
        $this->assertEqualsCanonicalizing(
            [$executive->id, $other->id],
            array_column($list, 'user_id')
        );

        $this->withToken($this->token($admin))
            ->getJson("/api/admin/executives/{$executive->id}")
            ->assertOk()
            ->assertJsonPath('executive.user_id', $executive->id);

        $this->withToken($this->token($admin))
            ->getJson("/api/admin/executives/{$staff->id}")
            ->assertNotFound();
    }

    public function test_public_qr_endpoint_serves_an_svg_for_a_valid_code(): void
    {
        $executive = $this->member();
        $executive->profile()->create([]);
        app(\App\Services\Billing\SubscriptionService::class)
            ->grantPlan($executive, Plan::EXECUTIVE, null, false, 'test_grant');

        $code = ExecutiveReferral::where('user_id', $executive->id)->firstOrFail()->code;

        $this->get("/api/referrals/{$code}/qr")
            ->assertOk()
            ->assertHeader('Content-Type', 'image/svg+xml')
            ->assertSee('<svg', false);
    }

    public function test_unknown_referral_code_returns_not_found(): void
    {
        $this->get('/api/referrals/UNKNOWNCODE/qr')->assertNotFound();
    }

    public function test_explicit_executive_grant_overrides_virtual_staff_on_admin_accounts(): void
    {
        $admin = $this->admin();

        $this->assertSame(
            Plan::STAFF,
            app(EntitlementService::class)->planFor($admin)->code
        );

        app(\App\Services\Billing\SubscriptionService::class)
            ->grantPlan($admin, Plan::EXECUTIVE, null, false, 'test_grant');

        $this->assertSame(
            Plan::EXECUTIVE,
            app(EntitlementService::class)->planFor($admin->fresh())->code
        );

        $this->withToken($this->token($admin->fresh()))
            ->getJson('/api/executive/referral')
            ->assertOk();
    }

    public function test_revoking_executive_hides_it_from_directory_but_keeps_the_code(): void
    {
        $admin = $this->admin();
        $executive = $this->member();
        $executive->profile()->create([]);

        $this->withToken($this->token($admin))
            ->postJson("/api/admin/users/{$executive->id}/subscription", ['plan' => Plan::EXECUTIVE])
            ->assertOk();

        $code = ExecutiveReferral::where('user_id', $executive->id)->firstOrFail()->code;

        $this->withToken($this->token($admin))
            ->deleteJson("/api/admin/users/{$executive->id}/subscription")
            ->assertOk();

        $this->assertSame([], $this->withToken($this->token($admin))
            ->getJson('/api/admin/executives')
            ->assertOk()
            ->json('executives'));

        $this->assertSame(
            $code,
            ExecutiveReferral::where('user_id', $executive->id)->firstOrFail()->code
        );
    }
}
