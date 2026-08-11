<?php

namespace Tests\Feature;

use App\Models\Connection;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ConnectionAvatarTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::firstOrCreate(['name' => 'member', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
    }

    public function test_connection_index_includes_avatar_for_both_parties(): void
    {
        $owner = User::factory()->create(['email_verified_at' => now(), 'status' => 'active']);
        $guest = User::factory()->create(['email_verified_at' => now(), 'status' => 'active']);

        $ownerProfile = $owner->profile()->create(['slug' => 'owner', 'is_live' => true]);
        $guestProfile = $guest->profile()->create(['slug' => 'guest', 'is_live' => true]);

        $connection = Connection::create([
            'member_id' => $owner->id,
            'guest_user_id' => $guest->id,
            'guest_name' => 'Guest Name',
            'guest_email' => $guest->email,
            'status' => 'approved',
        ]);

        // Avatar attached to the guest profile.
        $media = $guestProfile->addMediaFromUrl('https://picsum.photos/200')
            ->toMediaCollection('avatar');

        $token = $owner->createToken('auth-token')->plainTextToken;

        $response = $this->withToken($token)
            ->getJson('/api/connections')
            ->assertOk();

        $rows = $response->json('connections.data');
        $row = collect($rows)->firstWhere('id', $connection->id);

        // Owner sees the guest (other party) with their avatar.
        $this->assertNotNull($row, 'connection row present');
        $this->assertSame('received', $row['direction']);
        $this->assertSame($guest->id, $row['guest_user']['id']);
        $this->assertNotEmpty($row['guest_user']['profile']['avatar_url']);
    }

    public function test_sent_direction_includes_owner_avatar(): void
    {
        $owner = User::factory()->create(['email_verified_at' => now(), 'status' => 'active']);
        $guest = User::factory()->create(['email_verified_at' => now(), 'status' => 'active']);

        $owner->profile()->create(['slug' => 'owner', 'is_live' => true]);
        $guest->profile()->create(['slug' => 'guest', 'is_live' => true]);
        $owner->profile->addMediaFromUrl('https://picsum.photos/200')->toMediaCollection('avatar');

        $connection = Connection::create([
            'member_id' => $owner->id,
            'guest_user_id' => $guest->id,
            'guest_name' => 'Guest Name',
            'guest_email' => $guest->email,
            'status' => 'pending',
        ]);

        $token = $guest->createToken('auth-token')->plainTextToken;

        $response = $this->withToken($token)
            ->getJson('/api/connections')
            ->assertOk();

        $row = collect($response->json('connections.data'))->firstWhere('id', $connection->id);
        $this->assertSame('sent', $row['direction']);
        $this->assertNotEmpty($row['member']['profile']['avatar_url']);
    }
}