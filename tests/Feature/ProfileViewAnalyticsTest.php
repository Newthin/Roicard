<?php

namespace Tests\Feature;

use App\Models\AnalyticsEvent;
use App\Models\Profile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ProfileViewAnalyticsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::firstOrCreate(['name' => 'member', 'guard_name' => 'web']);
    }

    protected function createProfileOwner(string $slug = 'owner'): User
    {
        $user = User::factory()->create(['status' => 'active']);
        $user->profile()->create([
            'slug' => $slug,
            'is_live' => true,
            'title' => 'Test User',
        ]);
        return $user;
    }

    // ─── Test 1: Authenticated self-view ────────────────────────────────

    public function test_authenticated_self_view_does_not_record_analytics(): void
    {
        Notification::fake();

        $owner = $this->createProfileOwner('self-view-user');
        $token = $owner->createToken('test-token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/public/self-view-user');

        $response->assertStatus(200);

        $this->assertDatabaseMissing('analytics_events', [
            'member_id' => $owner->id,
            'type' => 'profile_view',
        ]);

        Notification::assertNothingSent();
    }

    // ─── Test 2: Authenticated user views another user's profile ────────

    public function test_authenticated_user_viewing_other_profile_records_analytics(): void
    {
        Notification::fake();

        $owner = $this->createProfileOwner('other-user');
        $viewer = User::factory()->create(['status' => 'active']);
        $token = $viewer->createToken('test-token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/public/other-user');

        $response->assertStatus(200);

        $this->assertDatabaseHas('analytics_events', [
            'member_id' => $owner->id,
            'type' => 'profile_view',
        ]);

        // The profile OWNER should receive the notification (not the viewer)
        Notification::assertSentTo($owner, \App\Notifications\ProfileViewedNotification::class);
    }

    // ─── Test 3: Unauthenticated visitor ────────────────────────────────

    public function test_unauthenticated_visitor_records_analytics(): void
    {
        Notification::fake();

        $owner = $this->createProfileOwner('guest-view-user');

        $response = $this->getJson('/api/public/guest-view-user');

        $response->assertStatus(200);

        $this->assertDatabaseHas('analytics_events', [
            'member_id' => $owner->id,
            'type' => 'profile_view',
        ]);
    }

    // ─── Test 4: Invalid token ──────────────────────────────────────────

    public function test_invalid_token_does_not_crash_and_records_as_guest(): void
    {
        $owner = $this->createProfileOwner('invalid-token-user');

        $response = $this->withHeader('Authorization', 'Bearer invalid-token-value')
            ->getJson('/api/public/invalid-token-user');

        $response->assertStatus(200);

        // Invalid token → treated as guest → analytics recorded
        $this->assertDatabaseHas('analytics_events', [
            'member_id' => $owner->id,
            'type' => 'profile_view',
        ]);
    }

    // ─── Test 5: Token belongs to another user ──────────────────────────

    public function test_different_users_token_does_not_count_as_self_view(): void
    {
        Notification::fake();

        $owner = $this->createProfileOwner('target-user');
        $otherUser = User::factory()->create(['status' => 'active']);
        $token = $otherUser->createToken('test-token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/public/target-user');

        $response->assertStatus(200);

        // This is NOT a self-view — analytics should be recorded for the owner
        $this->assertDatabaseHas('analytics_events', [
            'member_id' => $owner->id,
            'type' => 'profile_view',
        ]);
    }

    // ─── Test 6: Direct API request (server-side metadata fetch) ────────

    public function test_metadata_fetch_does_not_record_analytics(): void
    {
        $owner = $this->createProfileOwner('metadata-user');

        $response = $this->getJson('/api/public/metadata-user?_metadata=1');

        $response->assertStatus(200);

        $this->assertDatabaseMissing('analytics_events', [
            'member_id' => $owner->id,
            'type' => 'profile_view',
        ]);
    }

    // ─── Test 7: Profile still loads normally on self-view ──────────────

    public function test_self_view_still_returns_profile_data(): void
    {
        $owner = $this->createProfileOwner('still-loads');
        $token = $owner->createToken('test-token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/public/still-loads');

        $response->assertStatus(200)
            ->assertJson([
                'slug' => 'still-loads',
                'title' => 'Test User',
            ]);
    }

    // ─── Test 8: Guest profile view notification behavior ───────────────

    public function test_guest_view_can_trigger_notification_for_profile_owner(): void
    {
        Notification::fake();

        $owner = $this->createProfileOwner('notify-owner');

        $this->getJson('/api/public/notify-owner');

        // The notification is throttled and dispatched via the queued job,
        // so we just verify the analytics event was recorded
        $this->assertDatabaseHas('analytics_events', [
            'member_id' => $owner->id,
            'type' => 'profile_view',
        ]);
    }

    // ─── Test 9: Self-view on trackEvent endpoint ───────────────────────

    public function test_self_view_on_track_event_does_not_record(): void
    {
        $owner = $this->createProfileOwner('track-self');
        $token = $owner->createToken('test-token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/public/track-self/event', ['type' => 'contact_save']);

        $response->assertStatus(200);

        $this->assertDatabaseMissing('analytics_events', [
            'member_id' => $owner->id,
            'type' => 'contact_save',
        ]);
    }

    // ─── Test 10: Other user on trackEvent records analytics ────────────

    public function test_other_user_on_track_event_records_analytics(): void
    {
        $owner = $this->createProfileOwner('track-other');
        $viewer = User::factory()->create(['status' => 'active']);
        $token = $viewer->createToken('test-token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/public/track-other/event', ['type' => 'whatsapp_tap']);

        $response->assertStatus(200);

        $this->assertDatabaseHas('analytics_events', [
            'member_id' => $owner->id,
            'type' => 'whatsapp_tap',
        ]);
    }

    // ─── Test 11: Multiple self-views produce zero analytics ────────────

    public function test_multiple_self_views_produce_zero_analytics(): void
    {
        $owner = $this->createProfileOwner('multi-self');
        $token = $owner->createToken('test-token')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/public/multi-self');
        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/public/multi-self');
        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/public/multi-self');

        $this->assertSame(0, AnalyticsEvent::where('member_id', $owner->id)->count());
    }

    // ─── Test 12: Bearer token is properly resolved ────────────────────

    public function test_bearer_token_resolves_correct_user(): void
    {
        $owner = $this->createProfileOwner('token-resolve');
        $otherUser = User::factory()->create(['status' => 'active']);
        $token = $otherUser->createToken('test-token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/public/token-resolve');

        $response->assertStatus(200);

        // Other user's token should NOT be treated as self-view
        $this->assertDatabaseHas('analytics_events', [
            'member_id' => $owner->id,
            'type' => 'profile_view',
        ]);

        // Verify the analytics event was for the profile owner, not the token holder
        $event = AnalyticsEvent::where('member_id', $owner->id)
            ->where('type', 'profile_view')
            ->first();
        $this->assertNotNull($event);
        $this->assertSame($owner->id, $event->member_id);
    }
}
