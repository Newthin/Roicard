<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserAccountRecoveryTest extends TestCase
{
    use RefreshDatabase;

    public function test_lookup_command_reports_deleted_accounts(): void
    {
        $user = User::factory()->create(['email' => 'lookup.me@example.com']);
        $user->delete();

        $this->artisan('users:lookup', ['email' => 'lookup.me@example.com'])
            ->expectsOutputToContain('lookup.me@example.com')
            ->assertSuccessful();
    }

    public function test_restore_command_restores_a_soft_deleted_account(): void
    {
        $user = User::factory()->create(['email' => 'restore.me@example.com']);
        $user->delete();

        $this->assertSoftDeleted('users', ['email' => 'restore.me@example.com']);

        $this->artisan('users:restore', [
            'email' => 'restore.me@example.com',
            '--force' => true,
        ])->assertSuccessful();

        $this->assertNotSoftDeleted('users', ['email' => 'restore.me@example.com']);
    }

    public function test_purge_email_command_removes_a_soft_deleted_account(): void
    {
        $user = User::factory()->create(['email' => 'purge.me@example.com']);
        $user->delete();

        $this->artisan('users:purge-email', [
            'email' => 'purge.me@example.com',
            '--force' => true,
        ])->assertSuccessful();

        $this->assertDatabaseMissing('users', ['email' => 'purge.me@example.com']);
    }

    public function test_purge_email_command_refuses_an_active_account(): void
    {
        User::factory()->create(['email' => 'keep.me@example.com']);

        $this->artisan('users:purge-email', [
            'email' => 'keep.me@example.com',
            '--force' => true,
        ])->assertFailed();

        $this->assertDatabaseHas('users', ['email' => 'keep.me@example.com']);
    }
}
