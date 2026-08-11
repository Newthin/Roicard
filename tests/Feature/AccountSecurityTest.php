<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\TwoFactorService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AccountSecurityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // The UserObserver assigns roles on create; seed them so factories work.
        Role::firstOrCreate(['name' => 'member', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
    }

    protected function makeUser(array $attrs = []): User
    {
        return User::factory()->create([
            'email_verified_at' => now(),
            'status' => 'active',
            ...$attrs,
        ]);
    }

    public function test_logout_revokes_the_current_token(): void
    {
        $user = $this->makeUser();
        $token = $user->createToken('auth-token')->plainTextToken;

        $this->withToken($token)
            ->postJson('/api/auth/logout')
            ->assertOk();

        $this->assertSame(0, $user->tokens()->count());

        // The revoked token must no longer authenticate. (forgetGuards clears
        // the guard's memoized user from the previous request in the test app.)
        $this->app['auth']->forgetGuards();
        $this->withToken($token)
            ->getJson('/api/me')
            ->assertStatus(401);
    }

    public function test_password_change_verifies_current_password(): void
    {
        $user = $this->makeUser(['password' => bcrypt('OldPass123')]);
        $token = $user->createToken('auth-token')->plainTextToken;

        $this->withToken($token)
            ->postJson('/api/auth/change-password', [
                'current_password' => 'WrongPass123',
                'new_password' => 'NewPass123',
                'new_password_confirmation' => 'NewPass123',
            ])
            ->assertStatus(422);

        $this->withToken($token)
            ->postJson('/api/auth/change-password', [
                'current_password' => 'OldPass123',
                'new_password' => 'NewPass123',
                'new_password_confirmation' => 'NewPass123',
            ])
            ->assertOk();

        $this->assertTrue(
            \Illuminate\Support\Facades\Hash::check('NewPass123', $user->fresh()->password)
        );
    }

    public function test_account_update_changes_email_and_username(): void
    {
        $user = $this->makeUser();
        $user->profile()->create([]);
        $token = $user->createToken('auth-token')->plainTextToken;

        $this->withToken($token)
            ->putJson('/api/auth/account', [
                'email' => 'new@example.com',
                'username' => 'newhandle',
            ])
            ->assertOk()
            ->assertJson([
                'email_changed' => true,
                'requires_email_verification' => true,
            ]);

        $this->assertDatabaseHas('users', ['id' => $user->id, 'email' => 'new@example.com']);
        $this->assertDatabaseHas('profiles', ['user_id' => $user->id, 'slug' => 'newhandle']);
    }

    public function test_account_update_rejects_taken_email(): void
    {
        $other = $this->makeUser(['email' => 'taken@example.com']);
        $user = $this->makeUser();
        $token = $user->createToken('auth-token')->plainTextToken;

        $this->withToken($token)
            ->putJson('/api/auth/account', ['email' => 'taken@example.com'])
            ->assertStatus(422);
    }

    public function test_two_factor_full_flow(): void
    {
        $service = app(TwoFactorService::class);
        $user = $this->makeUser(['password' => bcrypt('Pass123')]);
        $token = $user->createToken('auth-token')->plainTextToken;

        // Status starts disabled.
        $this->withToken($token)
            ->getJson('/api/auth/two-factor/status')
            ->assertJson(['enabled' => false]);

        // Setup requires the current password.
        $this->withToken($token)
            ->postJson('/api/auth/two-factor/setup', ['current_password' => 'Pass123'])
            ->assertOk()
            ->assertJsonStructure(['secret', 'otpauth_url']);

        $secret = $user->fresh()->two_factor_secret;
        $this->assertNotNull($secret);

        // Wrong code is rejected.
        $this->withToken($token)
            ->postJson('/api/auth/two-factor/confirm', ['code' => '000000'])
            ->assertStatus(422);

        // Correct code enables 2FA.
        $code = $service->currentCode($secret);
        $this->withToken($token)
            ->postJson('/api/auth/two-factor/confirm', ['code' => $code])
            ->assertOk()
            ->assertJson(['enabled' => true]);

        // Login now returns a pending 2FA token instead of a session.
        $login = $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'Pass123',
        ]);

        $login->assertStatus(200)
            ->assertJson(['two_factor_required' => true])
            ->assertJsonStructure(['pending_token']);

        $pendingToken = $login->json('pending_token');

        // Verify with the current code issues a real session.
        $this->withToken($pendingToken)
            ->postJson('/api/auth/two-factor/verify', ['code' => $code])
            ->assertOk()
            ->assertJsonStructure(['token']);

        // A wrong code on verify is rejected.
        $login2 = $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'Pass123',
        ]);
        $this->withToken($login2->json('pending_token'))
            ->postJson('/api/auth/two-factor/verify', ['code' => '000000'])
            ->assertStatus(422);
    }

    public function test_two_factor_disable_requires_code_or_password(): void
    {
        $service = app(TwoFactorService::class);
        $secret = $service->generateSecret();
        $user = $this->makeUser([
            'password' => bcrypt('Pass123'),
            'two_factor_enabled' => true,
            'two_factor_secret' => $secret,
        ]);
        $token = $user->createToken('auth-token')->plainTextToken;

        // Wrong code rejected.
        $this->withToken($token)
            ->postJson('/api/auth/two-factor/disable', ['code' => '000000'])
            ->assertStatus(422);

        // Password fallback works.
        $this->withToken($token)
            ->postJson('/api/auth/two-factor/disable', ['current_password' => 'Pass123'])
            ->assertOk()
            ->assertJson(['enabled' => false]);
    }

    public function test_deactivated_account_cannot_login(): void
    {
        $user = $this->makeUser([
            'email' => 'deact@example.com',
            'password' => bcrypt('Pass123'),
        ]);
        $token = $user->createToken('auth-token')->plainTextToken;

        // Deactivation requires the current password.
        $this->withToken($token)
            ->postJson('/api/auth/deactivate', ['current_password' => 'Wrong'])
            ->assertStatus(422);

        $this->withToken($token)
            ->postJson('/api/auth/deactivate', ['current_password' => 'Pass123'])
            ->assertOk();

        $this->postJson('/api/auth/login', [
            'email' => 'deact@example.com',
            'password' => 'Pass123',
        ])
            ->assertStatus(403)
            ->assertJson(['error' => 'account_deactivated']);
    }

    public function test_reactivate_allows_login_again(): void
    {
        $user = $this->makeUser([
            'email' => 'react@example.com',
            'password' => bcrypt('Pass123'),
            'deactivated_at' => now(),
        ]);

        $this->postJson('/api/auth/reactivate', [
            'email' => 'react@example.com',
            'current_password' => 'Pass123',
        ])->assertOk();

        $this->postJson('/api/auth/login', [
            'email' => 'react@example.com',
            'password' => 'Pass123',
        ])->assertStatus(200)
            ->assertJsonStructure(['token']);
    }

    public function test_delete_account_removes_user(): void
    {
        $user = $this->makeUser(['password' => bcrypt('Pass123')]);
        $token = $user->createToken('auth-token')->plainTextToken;

        $this->withToken($token)
            ->deleteJson('/api/auth/account', ['current_password' => 'Wrong'])
            ->assertStatus(422);

        $this->withToken($token)
            ->deleteJson('/api/auth/account', ['current_password' => 'Pass123'])
            ->assertOk();

        $this->assertDatabaseMissing('users', ['id' => $user->id]);
    }
}