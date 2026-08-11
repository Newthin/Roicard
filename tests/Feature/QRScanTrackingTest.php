<?php

namespace Tests\Feature;

use App\Models\AnalyticsEvent;
use App\Models\Profile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class QRScanTrackingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::firstOrCreate(['name' => 'member', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
    }

    public function test_scan_endpoint_records_qr_scan_and_redirects_to_profile(): void
    {
        $user = User::factory()->create(['status' => 'active']);
        $profile = $user->profile()->create([
            'slug' => 'qrscanuser',
            'is_live' => true,
        ]);

        $response = $this->get('/api/qr/qrscanuser');

        $response->assertRedirect(config('app.frontend_url') . '/qrscanuser');

        $this->assertDatabaseHas('analytics_events', [
            'member_id' => $user->id,
            'type' => 'qr_scan',
        ]);
        $this->assertSame(1, AnalyticsEvent::where('member_id', $user->id)->where('type', 'qr_scan')->count());
    }

    public function test_scan_endpoint_is_not_cached(): void
    {
        $user = User::factory()->create(['status' => 'active']);
        $user->profile()->create([
            'slug' => 'qrnocache',
            'is_live' => true,
        ]);

        $first = $this->get('/api/qr/qrnocache');
        $first->assertHeader('Cache-Control');
        $cacheControl = $first->headers->get('Cache-Control');
        $this->assertStringContainsString('no-store', $cacheControl);

        // Hit the same URL twice — both must record because the route must
        // not be served from a cached 30s page response.
        $this->get('/api/qr/qrnocache');

        $this->assertSame(2, AnalyticsEvent::where('member_id', $user->id)->where('type', 'qr_scan')->count());
    }

    public function test_image_endpoint_serves_svg_and_does_not_record_scan(): void
    {
        $user = User::factory()->create(['status' => 'active']);
        $profile = $user->profile()->create([
            'slug' => 'qrimageuser',
            'is_live' => true,
        ]);

        $response = $this->get('/api/qr/image/qrimageuser');

        $response->assertOk()
            ->assertHeader('Content-Type', 'image/svg+xml')
            ->assertSee('svg');

        $this->assertDatabaseMissing('analytics_events', [
            'member_id' => $user->id,
            'type' => 'qr_scan',
        ]);
    }
}
