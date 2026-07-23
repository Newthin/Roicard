<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SmartCardTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_submit_delivery_address(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;

        $response = $this->withToken($token)
            ->postJson('/api/smart-cards/delivery', [
                'delivery_name' => 'John Doe',
                'street_address' => '123 Main St',
                'city' => 'Accra',
                'region' => 'Greater Accra',
                'country' => 'Ghana',
                'gps_address' => 'GA-123-4567',
                'delivery_phone' => '+233501234567',
                'delivery_notes' => 'Leave at reception',
            ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['smart_card']);
    }

    public function test_card_id_is_generated(): void
    {
        $user = User::factory()->create();
        $card = $user->smartCard()->create([
            'delivery_name' => 'John Doe',
            'street_address' => '123 Main St',
            'city' => 'Accra',
            'region' => 'Greater Accra',
            'delivery_phone' => '+233501234567',
        ]);

        $this->assertNotNull($card->card_id);
        $this->assertStringStartsWith('RC-', $card->card_id);
    }
}
