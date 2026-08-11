<?php

namespace Tests\Feature;

use App\Models\Connection;
use App\Models\Payment;
use App\Models\Profile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AdminDeleteUserTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::firstOrCreate(['name' => 'member', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
    }

    public function test_admin_can_delete_a_user_and_cascade_data(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $token = $admin->createToken('test')->plainTextToken;

        $target = User::factory()->create(['status' => 'active']);
        $target->profile()->create(['slug' => 'delete-me', 'is_live' => true]);
        \App\Models\Payment::create([
            'user_id' => $target->id,
            'provider' => 'paystack',
            'provider_reference' => 'test-ref',
            'amount' => 1000,
            'currency' => 'GHS',
            'status' => 'success',
        ]);
        Connection::create([
            'member_id' => $target->id,
            'guest_name' => 'Guest',
            'guest_email' => 'guest@example.com',
            'status' => 'approved',
        ]);
        $target->tokens()->create(['name' => 'session', 'token' => 'x', 'abilities' => ['*']]);

        $response = $this->withToken($token)->deleteJson('/api/admin/users/' . $target->id);

        $response->assertOk()
            ->assertJson(['message' => 'User account permanently deleted']);

        $this->assertDatabaseMissing('users', ['id' => $target->id]);
        $this->assertDatabaseMissing('profiles', ['user_id' => $target->id]);
        $this->assertDatabaseMissing('payments', ['user_id' => $target->id]);
        $this->assertDatabaseMissing('connections', ['member_id' => $target->id]);
        $this->assertDatabaseMissing('personal_access_tokens', ['tokenable_id' => $target->id]);
    }

    public function test_admin_cannot_delete_own_account(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $token = $admin->createToken('test')->plainTextToken;

        $response = $this->withToken($token)->deleteJson('/api/admin/users/' . $admin->id);

        $response->assertStatus(422);
        $this->assertDatabaseHas('users', ['id' => $admin->id]);
    }

    public function test_non_admin_cannot_delete_users(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;
        $target = User::factory()->create();

        $response = $this->withToken($token)->deleteJson('/api/admin/users/' . $target->id);

        $response->assertStatus(403);
        $this->assertDatabaseHas('users', ['id' => $target->id]);
    }
}
