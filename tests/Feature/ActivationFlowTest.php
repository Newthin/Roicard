<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ActivationFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(['name' => 'member', 'guard_name' => 'web']);
    }

    public function test_user_can_register(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'first_name' => 'John',
            'last_name' => 'Doe',
            'email' => 'john@example.com',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['user', 'requires_email_verification']);

        $this->assertDatabaseHas('users', [
            'email' => 'john@example.com',
            'status' => 'draft',
        ]);
    }

    public function test_user_can_login(): void
    {
        $user = User::factory()->create([
            'email' => 'john@example.com',
            'password' => bcrypt('password123'),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'john@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['user', 'token']);
    }

    public function test_login_fails_with_invalid_credentials(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'wrong@example.com',
            'password' => 'wrongpassword',
        ]);

        $response->assertStatus(401);
    }

    public function test_user_can_create_profile(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;

        $response = $this->withToken($token)
            ->postJson('/api/profile', [
                'title' => 'Software Engineer',
                'organisation' => 'Roicard',
                'whatsapp_phone' => '+233501234567',
                'location' => 'Accra',
                'bio' => 'A bio',
            ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['profile']);
    }

    public function test_unauthenticated_user_cannot_access_dashboard(): void
    {
        $response = $this->getJson('/api/dashboard');
        $response->assertStatus(401);
    }

    public function test_user_can_initiate_payment(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;

        $response = $this->withToken($token)
            ->withHeader('Idempotency-Key', 'test-key-1')
            ->postJson('/api/payments/initiate', [
                'amount' => 99.99,
                'currency' => 'GHS',
                'method' => 'mobile_money',
                'momo_number' => '+233501234567',
            ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['payment', 'redirect']);
    }

    public function test_initiating_with_a_pending_payment_resumes_it(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;

        $first = $this->withToken($token)
            ->withHeader('Idempotency-Key', 'test-key-1')
            ->postJson('/api/payments/initiate', [
                'amount' => 99.99,
                'currency' => 'GHS',
            ]);

        $reference = $first->json('payment.provider_reference');

        $second = $this->withToken($token)
            ->withHeader('Idempotency-Key', 'test-key-2')
            ->postJson('/api/payments/initiate', [
                'amount' => 99.99,
                'currency' => 'GHS',
            ]);

        $second->assertStatus(200)
            ->assertJsonPath('resumed', true)
            ->assertJsonPath('payment.provider_reference', $reference);
    }
}
