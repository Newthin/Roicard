<?php

namespace Tests\Unit;

use App\Models\Profile;
use App\Models\User;
use App\Services\SlugService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SlugServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_generates_slug_from_name(): void
    {
        $service = new SlugService();
        $slug = $service->generate('Daniel', 'Mensah');

        $this->assertEquals('daniel-mensah', $slug);
    }

    public function test_appends_number_on_collision(): void
    {
        $user = User::factory()->create();
        $user->profile()->create(['slug' => 'daniel-mensah']);

        $service = new SlugService();
        $slug = $service->generate('Daniel', 'Mensah');

        $this->assertEquals('daniel-mensah1', $slug);
    }

    public function test_handles_multiple_collisions(): void
    {
        $user1 = User::factory()->create();
        $user1->profile()->create(['slug' => 'daniel-mensah']);

        $user2 = User::factory()->create();
        $user2->profile()->create(['slug' => 'daniel-mensah1']);

        $service = new SlugService();
        $slug = $service->generate('Daniel', 'Mensah');

        $this->assertEquals('daniel-mensah2', $slug);
    }
}
