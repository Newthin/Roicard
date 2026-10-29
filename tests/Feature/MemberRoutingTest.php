<?php

namespace Tests\Feature;

use App\Models\Payment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
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
        // Activation is a membership control, not an onboarding override.
        $this->assertNull($target->onboarding_completed_at);

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
}
