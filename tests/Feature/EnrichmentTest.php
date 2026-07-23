<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EnrichmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_add_education_entry(): void
    {
        $user = User::factory()->create();
        $user->profile()->create();
        $token = $user->createToken('test')->plainTextToken;

        $response = $this->withToken($token)
            ->postJson('/api/profile/education', [
                'institution' => 'University of Ghana',
                'degree' => 'BSc. Computer Science',
                'start_year' => 2018,
                'end_year' => 2022,
                'honours' => 'First Class',
            ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['education']);
    }

    public function test_user_can_add_experience_entry(): void
    {
        $user = User::factory()->create();
        $user->profile()->create();
        $token = $user->createToken('test')->plainTextToken;

        $response = $this->withToken($token)
            ->postJson('/api/profile/experience', [
                'title' => 'Software Engineer',
                'company' => 'Roicard',
                'start_date' => '2022-01-01',
                'end_date' => '2023-01-01',
                'location' => 'Accra',
            ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['experience']);
    }

    public function test_user_can_update_social_links(): void
    {
        $user = User::factory()->create();
        $user->profile()->create();
        $token = $user->createToken('test')->plainTextToken;

        $response = $this->withToken($token)
            ->putJson('/api/profile/social-links', [
                'links' => [
                    ['platform' => 'linkedin', 'value' => 'https://linkedin.com/in/test'],
                    ['platform' => 'twitter', 'value' => 'https://twitter.com/test'],
                ],
            ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['social_links']);
    }
}
