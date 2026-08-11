<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class DataRetentionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::firstOrCreate(['name' => 'member', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
    }

    public function test_soft_deleted_user_cannot_login(): void
    {
        $user = User::factory()->create([
            'email' => 'retained@example.com',
            'status' => 'active',
            'password' => bcrypt('Pass123'),
        ]);
        $user->delete();

        $this->postJson('/api/auth/login', [
            'email' => 'retained@example.com',
            'password' => 'Pass123',
        ])->assertStatus(401);
    }

    public function test_soft_deleted_user_public_profile_is_hidden(): void
    {
        $user = User::factory()->create(['status' => 'active']);
        $user->profile()->create(['slug' => 'retained-user', 'is_live' => true]);
        $user->delete();

        $this->getJson('/api/public/retained-user')
            ->assertStatus(403)
            ->assertJson(['status' => 'draft']);
    }

    public function test_purge_removes_only_users_past_retention_window(): void
    {
        config(['app.data_retention_days' => 30]);

        $old = User::factory()->create(['status' => 'active']);
        $old->profile()->create(['slug' => 'old-user', 'is_live' => true]);
        $old->tokens()->create(['name' => 'session', 'token' => 'x', 'abilities' => ['*']]);
        $old->delete();
        User::withTrashed()->findOrFail($old->id)->forceFill(['deleted_at' => now()->subDays(60)])->save();

        $recent = User::factory()->create(['status' => 'active']);
        $recent->profile()->create(['slug' => 'recent-user', 'is_live' => true]);
        $recent->delete();

        $this->artisan('users:purge')->assertSuccessful();

        // Old account permanently gone, including its cascade-owned profile.
        $this->assertDatabaseMissing('users', ['id' => $old->id]);
        $this->assertDatabaseMissing('profiles', ['user_id' => $old->id]);
        $this->assertDatabaseMissing('personal_access_tokens', ['tokenable_id' => $old->id]);

        // Recent account is still retained (soft-deleted).
        $this->assertSoftDeleted('users', ['id' => $recent->id]);
        $this->assertDatabaseHas('profiles', ['user_id' => $recent->id]);
    }

    public function test_purge_honours_override_days(): void
    {
        config(['app.data_retention_days' => 30]);

        $older = User::factory()->create();
        $older->delete();
        User::withTrashed()->findOrFail($older->id)->forceFill(['deleted_at' => now()->subDays(15)])->save();

        // A shorter override removes it even though the default window is 30d.
        $this->artisan('users:purge', ['--days' => 7])->assertSuccessful();
        $this->assertDatabaseMissing('users', ['id' => $older->id]);

        $recent = User::factory()->create();
        $recent->delete();
        User::withTrashed()->findOrFail($recent->id)->forceFill(['deleted_at' => now()->subDays(3)])->save();

        $this->artisan('users:purge', ['--days' => 7])->assertSuccessful();
        $this->assertSoftDeleted('users', ['id' => $recent->id]);
    }
}
