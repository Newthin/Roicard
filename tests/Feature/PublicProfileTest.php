<?php

namespace Tests\Feature;

use App\Models\Profile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_profile_returns_profile_data(): void
    {
        $user = User::factory()->create(['status' => 'active']);
        $profile = $user->profile()->create([
            'title' => 'Software Engineer',
            'organisation' => 'Roicard',
            'bio' => 'A bio',
            'slug' => 'testuser',
            'is_live' => true,
        ]);

        $response = $this->getJson('/api/public/testuser');

        $response->assertStatus(200)
            ->assertJson([
                'slug' => 'testuser',
                'title' => 'Software Engineer',
            ]);
    }

    public function test_public_profile_returns_404_for_nonexistent_slug(): void
    {
        $response = $this->getJson('/api/public/nonexistent');
        $response->assertStatus(404);
    }

    public function test_public_profile_returns_404_when_not_live(): void
    {
        $user = User::factory()->create();
        $profile = $user->profile()->create([
            'slug' => 'notlive',
            'is_live' => false,
        ]);

        $response = $this->getJson('/api/public/notlive');
        $response->assertStatus(404);
    }

    public function test_guest_can_submit_connection_request(): void
    {
        $user = User::factory()->create(['status' => 'active']);
        $user->profile()->create([
            'slug' => 'testuser',
            'is_live' => true,
        ]);

        $response = $this->postJson('/api/connections', [
            'slug' => 'testuser',
            'guest_name' => 'Jane Doe',
            'guest_email' => 'jane@example.com',
            'guest_phone' => '+233501234567',
            'guest_org' => 'Acme Inc.',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['connection']);
    }
}
