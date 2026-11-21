<?php

namespace Tests\Feature;

use App\Models\ExecutiveReferral;
use App\Models\Plan;
use App\Models\ReferralClick;
use App\Models\User;
use App\Services\Billing\SubscriptionService;
use App\Services\Growth\ReferralAttributionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Growth Network item 2 — last-click attribution.
 *
 * A click writes an immutable audit event and a 30-day cookie. Attribution is
 * stored only when that visitor successfully registers.
 */
class ReferralAttributionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
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

    /** @return array{0: User, 1: string} */
    protected function makeExecutive(): array
    {
        $user = $this->member();
        $user->profile()->create([]);

        app(SubscriptionService::class)
            ->grantPlan($user, Plan::EXECUTIVE, null, false, 'test_grant');

        $code = ExecutiveReferral::where('user_id', $user->id)->firstOrFail()->code;

        return [$user, $code];
    }

    /** @param array<string, mixed> $extra */
    protected function registerPayload(array $extra = []): array
    {
        return [
            'first_name' => 'New',
            'last_name' => 'Member',
            'email' => 'new.member@example.com',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            ...$extra,
        ];
    }

    /**
     * JSON requests drop cookies unless credentials are enabled, and API routes
     * do not run the encrypt-cookies middleware — so send this one as plain.
     */
    protected function withReferralCookie(string $code): static
    {
        return $this->withCredentials()->withUnencryptedCookies([
            ReferralAttributionService::COOKIE_NAME => $code,
        ]);
    }

    public function test_click_endpoint_records_an_audit_event_and_sets_cookie(): void
    {
        [$executive, $code] = $this->makeExecutive();

        $response = $this->withHeaders([
            'User-Agent' => 'TestBrowser/1.0',
            'Referer' => 'https://example.com/page',
        ])->postJson("/api/referrals/{$code}/click");

        $response->assertNoContent();
        $response->assertPlainCookie(ReferralAttributionService::COOKIE_NAME, $code);

        $click = ReferralClick::firstOrFail();
        $this->assertSame($code, $click->code);
        $this->assertSame($executive->id, $click->executiveReferral->user_id);
        $this->assertSame('TestBrowser/1.0', $click->user_agent);
        $this->assertSame('https://example.com/page', $click->referrer);
        $this->assertNotNull($click->ip_hash);
        $this->assertSame(64, strlen($click->ip_hash));
    }

    public function test_registration_with_cookie_attributes_the_executive_and_clears_cookie(): void
    {
        [$executive, $code] = $this->makeExecutive();
        $this->postJson("/api/referrals/{$code}/click")->assertNoContent();

        $response = $this->withReferralCookie($code)
            ->postJson('/api/auth/register', $this->registerPayload());

        $response->assertCreated();
        $response->assertCookieExpired(ReferralAttributionService::COOKIE_NAME);

        $member = User::where('email', 'new.member@example.com')->firstOrFail();
        $this->assertSame($executive->id, $member->referred_by_user_id);
        $this->assertSame($code, $member->referred_by_code);
        $this->assertNotNull($member->referred_at);

        $click = ReferralClick::latest('id')->firstOrFail();
        $this->assertSame($member->id, $click->user_id);
    }

    public function test_last_click_wins_when_multiple_executives_are_visited(): void
    {
        [, $firstCode] = $this->makeExecutive();
        [$secondExecutive, $secondCode] = $this->makeExecutive();

        $first = $this->postJson("/api/referrals/{$firstCode}/click");
        $second = $this->postJson("/api/referrals/{$secondCode}/click");

        $first->assertPlainCookie(ReferralAttributionService::COOKIE_NAME, $firstCode);
        $second->assertPlainCookie(ReferralAttributionService::COOKIE_NAME, $secondCode);

        $this->withReferralCookie($secondCode)
            ->postJson('/api/auth/register', $this->registerPayload())
            ->assertCreated();

        $member = User::where('email', 'new.member@example.com')->firstOrFail();
        $this->assertSame($secondExecutive->id, $member->referred_by_user_id);
        $this->assertSame($secondCode, $member->referred_by_code);
    }

    public function test_referral_code_body_is_a_fallback_when_cookie_is_unavailable(): void
    {
        [$executive, $code] = $this->makeExecutive();

        $this->postJson('/api/auth/register', $this->registerPayload([
            'referral_code' => $code,
        ]))->assertCreated();

        $member = User::where('email', 'new.member@example.com')->firstOrFail();
        $this->assertSame($executive->id, $member->referred_by_user_id);
        $this->assertSame($code, $member->referred_by_code);
    }

    public function test_revoked_or_unknown_codes_are_ignored(): void
    {
        [, $code] = $this->makeExecutive();

        app(SubscriptionService::class)->revoke(
            ExecutiveReferral::where('code', $code)->firstOrFail()->user,
            'test_revoke'
        );

        $this->withReferralCookie($code)
            ->postJson('/api/auth/register', $this->registerPayload())
            ->assertCreated();

        $member = User::where('email', 'new.member@example.com')->firstOrFail();
        $this->assertNull($member->referred_by_user_id);
        $this->assertNull($member->referred_by_code);
        $this->assertNull($member->referred_at);
    }

    public function test_existing_attribution_is_never_overwritten(): void
    {
        [$firstExecutive, $firstCode] = $this->makeExecutive();
        [$secondExecutive, $secondCode] = $this->makeExecutive();

        $member = $this->member();
        $service = app(ReferralAttributionService::class);

        $firstRequest = \Illuminate\Http\Request::create('/');
        $firstRequest->cookies->set(ReferralAttributionService::COOKIE_NAME, $firstCode);
        $service->attributeRegistration($member, $firstRequest);

        $secondRequest = \Illuminate\Http\Request::create('/');
        $secondRequest->cookies->set(ReferralAttributionService::COOKIE_NAME, $secondCode);
        $service->attributeRegistration($member->fresh(), $secondRequest);

        $member->refresh();
        $this->assertSame($firstExecutive->id, $member->referred_by_user_id);
        $this->assertSame($firstCode, $member->referred_by_code);
        $this->assertNotSame($secondExecutive->id, $member->referred_by_user_id);
    }

    public function test_admin_can_audit_clicks_without_raw_ip_addresses(): void
    {
        [, $code] = $this->makeExecutive();
        $this->postJson("/api/referrals/{$code}/click")->assertNoContent();
        $this->withReferralCookie($code)
            ->postJson('/api/auth/register', $this->registerPayload())
            ->assertCreated();

        $response = $this->withToken($this->token($this->admin()))
            ->getJson('/api/admin/referral-clicks')
            ->assertOk();

        $click = $response->json('data.0');
        $this->assertSame($code, $click['code']);
        $this->assertNotNull($click['user_id']);
        $this->assertArrayHasKey('ip_hash', $click);
        $this->assertArrayNotHasKey('ip', $click);
    }

    protected function token(User $user): string
    {
        return $user->createToken('test')->plainTextToken;
    }
}
