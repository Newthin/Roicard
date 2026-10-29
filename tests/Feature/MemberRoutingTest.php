<?php

namespace Tests\Feature;

use App\Jobs\ProcessActivationJob;
use App\Mail\WelcomeMemberMail;
use App\Models\Payment;
use App\Models\SocialAccount;
use App\Models\User;
use App\Services\MemberAccessService;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * Covers the server-side routing contract that replaced the localStorage
 * onboarding guesswork, plus the admin account-management endpoints that let
 * staff create/activate/suspend members without faking payments.
 */
class MemberRoutingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(['name' => 'member', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
    }

    protected function member(array $attributes = []): User
    {
        return User::factory()->create([
            'email_verified_at' => now(),
            'status' => 'draft',
            ...$attributes,
        ]);
    }

    protected function admin(): User
    {
        return User::factory()->create([
            'email_verified_at' => now(),
            'status' => 'active',
            'role' => 'admin',
        ]);
    }

    /** Fake a successful Google OAuth identity for callback tests. */
    protected function fakeGoogleUser(
        string $email,
        string $name = 'New Member',
        string $id = 'google-123'
    ): void {
        $socialiteUser = (new SocialiteUser())->map([
            'id' => $id,
            'name' => $name,
            'email' => $email,
            'avatar' => null,
        ]);

        $provider = \Mockery::mock(\Laravel\Socialite\Contracts\Provider::class);
        $provider->shouldReceive('stateless')->andReturnSelf();
        $provider->shouldReceive('user')->andReturn($socialiteUser);

        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);
    }

    /** @return array{token?: string, user?: array<string, mixed>, error?: string} */
    protected function oauthRedirectPayload(\Illuminate\Testing\TestResponse $response): array
    {
        $response->assertRedirect();
        $location = (string) $response->headers->get('Location');
        parse_str((string) parse_url($location, PHP_URL_QUERY), $query);

        if (isset($query['user']) && is_string($query['user'])) {
            $query['user'] = json_decode($query['user'], true);
        }

        return $query;
    }

    public function test_incomplete_member_is_routed_to_onboarding_on_login_and_me(): void
    {
        $user = $this->member(['password' => bcrypt('Secret123!')]);

        $login = $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'Secret123!',
        ]);

        $login->assertOk()
            ->assertJsonPath('user.next_step', 'onboarding')
            ->assertJsonPath('user.onboarding_completed', false);

        $this->withToken($login->json('token'))
            ->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('user.next_step', 'onboarding');
    }

    public function test_completed_draft_member_reaches_the_dashboard_without_paying(): void
    {
        $user = $this->member([
            'password' => bcrypt('Secret123!'),
            'onboarding_completed_at' => now(),
        ]);

        $login = $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'Secret123!',
        ]);

        // Payment never gates dashboard access: a completed member stays on
        // draft until they activate, but next_step is still dashboard.
        $login->assertOk()
            ->assertJsonPath('user.status', 'draft')
            ->assertJsonPath('user.next_step', 'dashboard');
    }

    public function test_admin_login_lands_on_dashboard_while_keeping_console_access(): void
    {
        $admin = $this->admin();
        $admin->forceFill(['password' => bcrypt('Secret123!')])->save();

        $login = $this->postJson('/api/auth/login', [
            'email' => $admin->email,
            'password' => 'Secret123!',
        ]);

        // Admins start on the member dashboard like everyone else.
        $login->assertOk()
            ->assertJsonPath('user.role', 'admin')
            ->assertJsonPath('user.next_step', 'dashboard');

        // The console is guarded by role, not by the routing hint, so admins
        // can still open it from the dashboard.
        $this->withToken($login->json('token'))
            ->getJson('/api/admin/stats')
            ->assertOk();
    }

    public function test_profile_complete_flips_next_step_to_dashboard(): void
    {
        $user = $this->member();
        $user->profile()->create(['title' => 'Engineer']);
        $token = $user->createToken('auth-token')->plainTextToken;

        $this->withToken($token)
            ->postJson('/api/profile/complete')
            ->assertOk()
            ->assertJsonPath('user.onboarding_completed', true)
            ->assertJsonPath('user.next_step', 'dashboard');

        $this->assertNotNull($user->fresh()->onboarding_completed_at);
    }

    public function test_skip_path_completes_onboarding_with_an_empty_profile(): void
    {
        Mail::fake();

        $user = $this->member();
        $token = $user->createToken('auth-token')->plainTextToken;

        // The member skipped every optional step: no profile data is sent at
        // all. Completion must still be recorded so they are not looped.
        $this->withToken($token)
            ->postJson('/api/profile/complete', [])
            ->assertOk()
            ->assertJsonPath('user.onboarding_completed', true)
            ->assertJsonPath('user.next_step', 'dashboard');

        $this->assertNotNull($user->fresh()->onboarding_completed_at);
    }

    public function test_profile_update_cannot_publish_a_draft_member(): void
    {
        $user = $this->member();
        $user->profile()->create([]);
        $token = $user->createToken('auth-token')->plainTextToken;

        $this->withToken($token)
            ->putJson('/api/profile', [
                'title' => 'Engineer',
                // A client must not be able to publish itself by smuggling
                // this field into the profile payload.
                'is_live' => true,
            ])
            ->assertOk();

        $this->assertSame('draft', $user->fresh()->status);
        $this->assertFalse((bool) $user->profile->fresh()->is_live);
    }

    public function test_admin_created_user_skips_onboarding_and_can_sign_in(): void
    {
        $admin = $this->admin();
        $adminToken = $admin->createToken('admin')->plainTextToken;

        $response = $this->withToken($adminToken)->postJson('/api/admin/users', [
            'first_name' => 'Ama',
            'last_name' => 'Mensah',
            'email' => 'ama@example.com',
            'username' => 'ama-mensah',
            'password' => 'Secret123!',
            'password_confirmation' => 'Secret123!',
        ]);

        $response->assertCreated()
            ->assertJsonPath('user.onboarding_completed', true)
            ->assertJsonPath('user.next_step', 'dashboard');

        $this->assertDatabaseHas('users', [
            'email' => 'ama@example.com',
            'status' => 'draft',
            'role' => 'member',
        ]);
        $this->assertNotNull(
            User::where('email', 'ama@example.com')->value('onboarding_completed_at')
        );

        // The account the admin created can immediately sign in and is not
        // trapped in the onboarding journey.
        $login = $this->postJson('/api/auth/login', [
            'email' => 'ama@example.com',
            'password' => 'Secret123!',
        ]);

        $login->assertOk()->assertJsonPath('user.next_step', 'dashboard');
    }

    public function test_admin_can_create_a_user_with_access_suspended(): void
    {
        $admin = $this->admin();
        $adminToken = $admin->createToken('admin')->plainTextToken;

        $this->withToken($adminToken)->postJson('/api/admin/users', [
            'first_name' => 'Kofi',
            'last_name' => 'Boateng',
            'email' => 'kofi@example.com',
            'password' => 'Secret123!',
            'password_confirmation' => 'Secret123!',
            'account_access' => 'suspended',
        ])->assertCreated();

        $created = User::where('email', 'kofi@example.com')->firstOrFail();

        $this->assertTrue($created->isDeactivated());
        $this->assertTrue($created->isSuspendedByAdmin());

        $this->postJson('/api/auth/login', [
            'email' => 'kofi@example.com',
            'password' => 'Secret123!',
        ])
            ->assertStatus(403)
            ->assertJsonPath('error', 'account_deactivated');
    }

    public function test_admin_activation_publishes_profile_without_creating_a_payment(): void
    {
        $admin = $this->admin();
        $adminToken = $admin->createToken('admin')->plainTextToken;
        $target = $this->member(['status' => 'draft']);
        $target->profile()->create(['title' => 'Designer']);

        $this->withToken($adminToken)
            ->patchJson("/api/admin/users/{$target->id}", ['status' => 'active'])
            ->assertOk()
            ->assertJsonPath('user.status', 'active');

        $target->refresh();

        $this->assertSame('active', $target->status);
        $this->assertTrue((bool) $target->profile->fresh()->is_live);
        // Activation also clears onboarding so an activated member can never
        // be bounced back into the journey after signing in.
        $this->assertNotNull($target->onboarding_completed_at);
        $this->assertSame(
            MemberAccessService::NEXT_DASHBOARD,
            app(MemberAccessService::class)->nextStep($target->fresh())
        );

        // Activation is an explicit admin override, not a fake sale.
        $this->assertSame(0, Payment::where('user_id', $target->id)->count());
    }

    public function test_admin_suspend_blocks_login_and_revokes_sessions_without_changing_membership(): void
    {
        $admin = $this->admin();
        $adminToken = $admin->createToken('admin')->plainTextToken;

        $target = $this->member([
            'status' => 'active',
            'password' => bcrypt('Secret123!'),
            'onboarding_completed_at' => now(),
        ]);
        $target->profile()->create(['is_live' => true]);
        $target->createToken('member-session');

        $this->withToken($adminToken)
            ->patchJson("/api/admin/users/{$target->id}", ['account_access' => 'suspended'])
            ->assertOk()
            ->assertJsonPath('user.is_deactivated', true);

        $target->refresh();

        $this->assertNotNull($target->deactivated_at);
        // Suspension is an access control, not a membership downgrade.
        $this->assertSame('active', $target->status);
        $this->assertFalse((bool) $target->profile->fresh()->is_live);
        $this->assertSame(0, $target->tokens()->count());

        $this->postJson('/api/auth/login', [
            'email' => $target->email,
            'password' => 'Secret123!',
        ])
            ->assertStatus(403)
            ->assertJsonPath('error', 'account_deactivated');

        // Only the admin console can lift an administrative suspension; the
        // member must not be able to reactivate their own blocked account.
        $this->assertTrue($target->fresh()->isSuspendedByAdmin());

        $this->postJson('/api/auth/reactivate', [
            'email' => $target->email,
            'current_password' => 'Secret123!',
        ])
            ->assertStatus(403)
            ->assertJsonPath('error', 'account_suspended');

        $this->assertNotNull($target->fresh()->deactivated_at);
    }

    public function test_member_can_reactivate_an_account_they_deactivated_themselves(): void
    {
        $user = $this->member([
            'status' => 'active',
            'password' => bcrypt('Secret123!'),
        ]);
        $token = $user->createToken('auth-token')->plainTextToken;

        $this->withToken($token)
            ->postJson('/api/auth/deactivate', ['current_password' => 'Secret123!'])
            ->assertOk();

        $this->assertFalse($user->fresh()->isSuspendedByAdmin());

        $this->postJson('/api/auth/reactivate', [
            'email' => $user->email,
            'current_password' => 'Secret123!',
        ])->assertOk();

        $this->assertNull($user->fresh()->deactivated_at);
        $this->assertTrue((bool) $user->fresh()->profile->is_live);
    }

    public function test_activating_membership_does_not_republish_a_suspended_profile(): void
    {
        $admin = $this->admin();
        $adminToken = $admin->createToken('admin')->plainTextToken;
        $target = $this->member(['status' => 'draft']);
        $target->profile()->create([]);

        $this->withToken($adminToken)
            ->patchJson("/api/admin/users/{$target->id}", [
                'status' => 'active',
                'account_access' => 'suspended',
            ])
            ->assertOk();

        $this->assertSame('active', $target->fresh()->status);
        $this->assertFalse((bool) $target->profile->fresh()->is_live);
    }

    public function test_admin_cannot_demote_or_suspend_themselves(): void
    {
        $admin = $this->admin();
        $adminToken = $admin->createToken('admin')->plainTextToken;

        $this->withToken($adminToken)
            ->patchJson("/api/admin/users/{$admin->id}", ['role' => 'member'])
            ->assertStatus(422);

        $this->withToken($adminToken)
            ->patchJson("/api/admin/users/{$admin->id}", ['account_access' => 'suspended'])
            ->assertStatus(422);

        $this->assertSame('admin', $admin->fresh()->role);
        $this->assertNull($admin->fresh()->deactivated_at);
    }

    public function test_admin_can_update_login_details_and_reset_password(): void
    {
        $admin = $this->admin();
        $adminToken = $admin->createToken('admin')->plainTextToken;
        $target = $this->member();
        $target->profile()->create([]);
        $target->createToken('member-session');

        $this->withToken($adminToken)
            ->patchJson("/api/admin/users/{$target->id}", [
                'email' => 'updated@example.com',
                'username' => 'updated-handle',
                'password' => 'BrandNew123!',
                'password_confirmation' => 'BrandNew123!',
                'email_verified' => true,
            ])
            ->assertOk();

        $target->refresh();

        $this->assertSame('updated@example.com', $target->email);
        $this->assertTrue(Hash::check('BrandNew123!', $target->password));
        $this->assertDatabaseHas('profiles', [
            'user_id' => $target->id,
            'slug' => 'updated-handle',
        ]);
        // A password reset invalidates all existing sessions.
        $this->assertSame(0, $target->tokens()->count());
    }

    public function test_mock_payment_confirmation_activates_membership(): void
    {
        config(['app.payment_provider' => 'mock']);

        $user = $this->member();
        $user->profile()->create([]);
        $token = $user->createToken('auth-token')->plainTextToken;

        $payment = Payment::create([
            'user_id' => $user->id,
            'amount' => 100,
            'currency' => 'GHS',
            'method' => 'card',
            'status' => 'pending',
            'provider' => 'mock',
            'provider_reference' => 'mock-ref-1',
        ]);

        $this->withToken($token)
            ->postJson('/api/payments/mock/confirm', ['reference' => 'mock-ref-1'])
            ->assertOk()
            ->assertJsonPath('status', 'success');

        $this->assertSame('success', $payment->fresh()->status);
        $this->assertSame('active', $user->fresh()->status);
        $this->assertTrue((bool) $user->profile->fresh()->is_live);
    }

    public function test_mock_confirmation_is_hidden_when_a_real_provider_is_configured(): void
    {
        config(['app.payment_provider' => 'paystack']);

        $user = $this->member();
        $token = $user->createToken('auth-token')->plainTextToken;

        $this->withToken($token)
            ->postJson('/api/payments/mock/confirm', ['reference' => 'anything'])
            ->assertNotFound();
    }

    public function test_backfill_only_marks_members_with_real_profile_content(): void
    {
        $completed = $this->member();
        $completed->profile()->create(['title' => 'Product Manager']);

        $empty = $this->member();
        $empty->profile()->create([]);

        /** @var object $migration */
        $migration = require database_path('migrations/2026_10_29_000001_backfill_onboarding_completed_at.php');
        $migration->up();

        $this->assertNotNull($completed->fresh()->onboarding_completed_at);
        $this->assertNull($empty->fresh()->onboarding_completed_at);
    }

    public function test_login_with_unknown_email_returns_a_clean_401_with_signup_hint(): void
    {
        $this->postJson('/api/auth/login', [
            'email' => 'nobody@example.com',
            'password' => 'Secret123!',
        ])
            ->assertStatus(401)
            ->assertJsonPath('error', 'invalid_credentials')
            ->assertJsonPath('signup_url', '/auth/register');
    }

    public function test_login_is_case_insensitive_for_the_email(): void
    {
        $user = $this->member(['password' => bcrypt('Secret123!')]);

        $this->postJson('/api/auth/login', [
            'email' => strtoupper($user->email),
            'password' => 'Secret123!',
        ])
            ->assertOk()
            ->assertJsonPath('user.id', $user->id);
    }

    public function test_account_with_a_malformed_password_hash_gets_401_not_500(): void
    {
        $user = $this->member();
        // Bypass the hashed cast to simulate legacy/imported rows.
        \Illuminate\Support\Facades\DB::table('users')
            ->where('id', $user->id)
            ->update(['password' => 'not-a-valid-hash']);

        $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'anything',
        ])->assertStatus(401);
    }

    public function test_payment_activation_marks_onboarding_complete_and_lands_on_dashboard(): void
    {
        Mail::fake();

        $user = $this->member();
        $user->profile()->create([]);

        $payment = Payment::create([
            'user_id' => $user->id,
            'amount' => 100,
            'currency' => 'GHS',
            'method' => 'card',
            'status' => 'pending',
            'provider' => 'mock',
            'provider_reference' => 'pay-ref-onboarding',
        ]);

        ProcessActivationJob::dispatchSync($payment);

        $user->refresh();

        $this->assertSame('active', $user->status);
        $this->assertNotNull($user->onboarding_completed_at);
        $this->assertSame(
            MemberAccessService::NEXT_DASHBOARD,
            app(MemberAccessService::class)->nextStep($user)
        );

        Mail::assertQueued(WelcomeMemberMail::class, 1);
    }

    public function test_completing_onboarding_sends_the_welcome_email_only_once(): void
    {
        Mail::fake();

        $user = $this->member();
        $user->profile()->create([]);
        $token = $user->createToken('auth-token')->plainTextToken;

        $this->withToken($token)->postJson('/api/profile/complete')->assertOk();
        $this->withToken($token)->postJson('/api/profile/complete')->assertOk();

        Mail::assertQueued(WelcomeMemberMail::class, 1);
    }

    public function test_saving_profile_then_completing_does_not_duplicate_the_welcome_email(): void
    {
        Mail::fake();

        $user = $this->member();
        $user->profile()->create([]);
        $token = $user->createToken('auth-token')->plainTextToken;

        $this->withToken($token)
            ->putJson('/api/profile', ['title' => 'Engineer'])
            ->assertOk();

        $this->withToken($token)->postJson('/api/profile/complete')->assertOk();

        Mail::assertQueued(WelcomeMemberMail::class, 1);
    }

    public function test_admin_profile_setup_completes_onboarding_without_emailing_by_default(): void
    {
        Mail::fake();

        $admin = $this->admin();
        $adminToken = $admin->createToken('admin')->plainTextToken;
        $target = $this->member();
        $target->profile()->create([]);

        $this->withToken($adminToken)
            ->patchJson("/api/admin/users/{$target->id}/profile", [
                'first_name' => 'Ama',
                'last_name' => 'Mensah',
                'title' => 'Product Designer',
                'organisation' => 'Roicard',
                'role_description' => 'Designs member experiences.',
                'bio' => 'Building delightful identity products.',
                'location' => 'Accra',
                'phone' => '+233200000000',
                'whatsapp_phone' => '+233200000000',
                'seeking' => 'Partners',
                'offering' => 'Product design',
                'interests' => json_encode(['Design', 'Technology']),
                'social_links' => json_encode([
                    'linkedin' => 'https://linkedin.com/in/ama',
                    'youtube' => 'https://youtube.com/@ama',
                ]),
                'education' => [[
                    'institution' => 'University of Ghana',
                    'degree' => 'BSc Computer Science',
                    'start_year' => 2016,
                    'end_year' => 2020,
                ]],
                'experience' => [[
                    'title' => 'Product Designer',
                    'company' => 'Roicard',
                    'start_date' => '2021-01-01',
                ]],
                'achievements' => [[
                    'title' => 'Design Award',
                    'issuer' => 'Ghana Design Council',
                    'date' => '2024-01-01',
                ]],
            ])
            ->assertOk()
            ->assertJsonPath('user.onboarding_completed', true);

        $target->refresh();

        $this->assertNotNull($target->onboarding_completed_at);
        $this->assertDatabaseHas('profiles', [
            'user_id' => $target->id,
            'title' => 'Product Designer',
            'organisation' => 'Roicard',
        ]);
        $this->assertDatabaseHas('education_entries', [
            'profile_id' => $target->profile->id,
            'institution' => 'University of Ghana',
        ]);
        $this->assertDatabaseHas('experience_entries', [
            'profile_id' => $target->profile->id,
            'company' => 'Roicard',
        ]);
        $this->assertDatabaseHas('achievement_entries', [
            'profile_id' => $target->profile->id,
            'title' => 'Design Award',
        ]);
        $this->assertDatabaseHas('social_links', [
            'profile_id' => $target->profile->id,
            'platform' => 'youtube',
        ]);

        // Admin completion is explicit and does not email the member unless
        // the admin opted in.
        Mail::assertNothingQueued();
    }

    public function test_admin_created_and_activated_member_reaches_dashboard_and_public_profile(): void
    {
        $admin = $this->admin();
        $adminToken = $admin->createToken('admin')->plainTextToken;

        $created = $this->withToken($adminToken)->postJson('/api/admin/users', [
            'first_name' => 'Yaw',
            'last_name' => 'Owusu',
            'email' => 'yaw@example.com',
            'username' => 'yaw-owusu',
            'password' => 'Secret123!',
            'password_confirmation' => 'Secret123!',
            'status' => 'active',
        ])->assertCreated();

        $userId = $created->json('user.id');

        $this->withToken($adminToken)
            ->patchJson("/api/admin/users/{$userId}/profile", [
                'title' => 'Architect',
                'bio' => 'Designing spaces.',
                'location' => 'Kumasi',
                'interests' => json_encode(['Architecture']),
            ])
            ->assertOk();

        $login = $this->postJson('/api/auth/login', [
            'email' => 'yaw@example.com',
            'password' => 'Secret123!',
        ]);

        $login->assertOk()
            ->assertJsonPath('user.next_step', 'dashboard')
            ->assertJsonPath('user.onboarding_completed', true)
            ->assertJsonPath('user.role', 'member');

        $this->getJson('/api/public/yaw-owusu')
            ->assertOk()
            ->assertJsonPath('title', 'Architect')
            ->assertJsonPath('location', 'Kumasi');
    }

    public function test_admin_can_send_a_password_reset_link_instead_of_sharing_plaintext(): void
    {
        Notification::fake();

        $admin = $this->admin();
        $adminToken = $admin->createToken('admin')->plainTextToken;
        $target = $this->member();

        $this->withToken($adminToken)
            ->postJson("/api/admin/users/{$target->id}/password-reset")
            ->assertOk();

        Notification::assertSentTo($target, ResetPassword::class);
    }

    public function test_admin_can_flip_onboarding_state_without_touching_payment(): void
    {
        $admin = $this->admin();
        $adminToken = $admin->createToken('admin')->plainTextToken;
        $target = $this->member(['status' => 'draft']);

        $this->withToken($adminToken)
            ->patchJson("/api/admin/users/{$target->id}", ['onboarding_completed' => false])
            ->assertOk()
            ->assertJsonPath('user.onboarding_completed', false)
            ->assertJsonPath('user.next_step', 'onboarding');

        $this->withToken($adminToken)
            ->patchJson("/api/admin/users/{$target->id}", ['onboarding_completed' => true])
            ->assertOk()
            ->assertJsonPath('user.onboarding_completed', true)
            ->assertJsonPath('user.next_step', 'dashboard');

        $this->assertSame('draft', $target->fresh()->status);
        $this->assertSame(0, Payment::where('user_id', $target->id)->count());
    }

    public function test_user_creation_survives_unseeded_spatie_roles(): void
    {
        Role::where('name', 'member')->delete();

        $user = User::factory()->create(['role' => 'member']);

        $this->assertSame('member', $user->fresh()->role);
        $this->assertSame(0, $user->roles()->count());
    }

    public function test_google_signup_creates_a_verified_member_and_routes_to_onboarding(): void
    {
        $this->fakeGoogleUser('gmail.member@example.com', 'Gmail Member');

        $payload = $this->oauthRedirectPayload($this->get('/api/auth/google/callback'));

        $this->assertArrayNotHasKey('error', $payload);
        $this->assertNotEmpty($payload['token']);
        $this->assertSame('onboarding', $payload['user']['next_step']);
        $this->assertSame('member', $payload['user']['role']);
        $this->assertTrue($payload['user']['email_verified']);

        $user = User::where('email', 'gmail.member@example.com')->firstOrFail();
        $this->assertNotNull($user->email_verified_at);
        $this->assertNotNull($user->profile);
        $this->assertSame('member', $user->role);
    }

    public function test_google_signup_survives_unseeded_spatie_roles(): void
    {
        // Production must not 500 just because the role seeder has not run.
        Role::where('name', 'member')->delete();

        $this->fakeGoogleUser('gmail.unseeded@example.com', 'Unseeded Member');

        $payload = $this->oauthRedirectPayload($this->get('/api/auth/google/callback'));

        $this->assertArrayNotHasKey('error', $payload);
        $this->assertNotEmpty($payload['token']);

        $user = User::where('email', 'gmail.unseeded@example.com')->firstOrFail();
        $this->assertSame('member', $user->role);
        $this->assertSame(0, $user->roles()->count());
    }

    public function test_social_google_signup_creates_a_member_and_routes_to_onboarding(): void
    {
        $this->fakeGoogleUser('social.member@example.com', 'Social Member');

        $payload = $this->oauthRedirectPayload($this->get('/api/auth/social/google/callback'));

        $this->assertArrayNotHasKey('error', $payload);
        $this->assertNotEmpty($payload['token']);
        $this->assertSame('onboarding', $payload['user']['next_step']);

        $user = User::where('email', 'social.member@example.com')->firstOrFail();
        $this->assertNotNull($user->email_verified_at);
        $this->assertDatabaseHas('social_accounts', [
            'user_id' => $user->id,
            'provider' => 'google',
            'provider_id' => 'google-123',
        ]);
    }

    public function test_social_signup_with_a_deleted_linked_user_fails_gracefully(): void
    {
        $user = $this->member(['email' => 'deleted.member@example.com']);
        SocialAccount::create([
            'user_id' => $user->id,
            'provider' => 'google',
            'provider_id' => 'google-123',
            'email' => $user->email,
        ]);
        $user->delete();

        $this->fakeGoogleUser('deleted.member@example.com', 'Deleted Member');

        $payload = $this->oauthRedirectPayload($this->get('/api/auth/social/google/callback'));

        // No 500 and no duplicate insert against the soft-deleted email.
        $this->assertSame('account_deleted', $payload['error']);
        $this->assertSame(
            1,
            User::withTrashed()->where('email', 'deleted.member@example.com')->count()
        );
    }

    public function test_google_signup_with_a_deleted_email_returns_account_deleted(): void
    {
        $user = $this->member(['email' => 'deleted.gmail@example.com']);
        $user->delete();

        $this->fakeGoogleUser('deleted.gmail@example.com', 'Deleted Gmail');

        $payload = $this->oauthRedirectPayload($this->get('/api/auth/google/callback'));

        // The dedicated Google controller must report the same state as the
        // social controller instead of falling through to a unique violation.
        $this->assertSame('account_deleted', $payload['error']);
        $this->assertSame(
            1,
            User::withTrashed()->where('email', 'deleted.gmail@example.com')->count()
        );
    }
}
