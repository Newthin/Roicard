<?php

namespace Tests\Feature;

use App\Models\MeetingBooking;
use App\Models\MeetingBlockedDate;
use App\Models\MeetingType;
use App\Models\MeetingTypeAvailability;
use App\Models\Profile;
use App\Models\User;
use App\Services\BookingEngine;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MeetingSecurityTest extends TestCase
{
    use RefreshDatabase;

    protected User $host;
    protected User $otherUser;
    protected User $admin;
    protected MeetingType $type;
    protected Profile $profile;

    protected function setUp(): void
    {
        parent::setUp();

        $this->host = User::factory()->create([
            'status' => 'active',
            'timezone' => 'America/New_York',
        ]);

        $this->otherUser = User::factory()->create([
            'status' => 'active',
            'timezone' => 'America/Chicago',
        ]);

        $this->admin = User::factory()->create([
            'status' => 'active',
            'role' => 'admin',
        ]);

        $this->profile = $this->host->profile()->create([
            'slug' => 'testhost',
            'is_live' => true,
            'title' => 'Test Host',
        ]);

        $this->type = MeetingType::create([
            'user_id' => $this->host->id,
            'name' => '30-min Call',
            'description' => 'Quick call',
            'duration_minutes' => 30,
            'format' => MeetingType::FORMAT_GOOGLE_MEET,
            'buffer_minutes' => 0,
            'capacity' => 1,
            'is_active' => true,
            'sort_order' => 0,
            'min_notice_hours' => 2,
            'advance_booking_days' => 30,
            'max_bookings_per_day' => null,
        ]);

        for ($day = 1; $day <= 5; $day++) {
            MeetingTypeAvailability::create([
                'meeting_type_id' => $this->type->id,
                'day_of_week' => $day,
                'start_time' => '09:00',
                'end_time' => '17:00',
            ]);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // IDOR PROTECTION — Meeting Types
    // ═══════════════════════════════════════════════════════════════════

    public function test_user_cannot_view_other_users_meeting_type(): void
    {
        $token = $this->otherUser->createToken('test')->plainTextToken;

        $response = $this->withToken($token)
            ->getJson("/api/meeting-types/{$this->type->id}");

        $response->assertStatus(403);
    }

    public function test_user_cannot_update_other_users_meeting_type(): void
    {
        $token = $this->otherUser->createToken('test')->plainTextToken;

        $response = $this->withToken($token)
            ->patchJson("/api/meeting-types/{$this->type->id}", [
                'name' => 'Hacked Meeting Type',
                'duration_minutes' => 60,
                'format' => MeetingType::FORMAT_GOOGLE_MEET,
            ]);

        $response->assertStatus(403);

        $this->assertDatabaseHas('meeting_types', [
            'id' => $this->type->id,
            'name' => '30-min Call',
        ]);
    }

    public function test_user_cannot_delete_other_users_meeting_type(): void
    {
        $token = $this->otherUser->createToken('test')->plainTextToken;

        $response = $this->withToken($token)
            ->deleteJson("/api/meeting-types/{$this->type->id}");

        $response->assertStatus(403);

        $this->assertDatabaseHas('meeting_types', ['id' => $this->type->id]);
    }

    public function test_user_cannot_access_other_users_meeting_type_slots(): void
    {
        $token = $this->otherUser->createToken('test')->plainTextToken;

        $response = $this->withToken($token)
            ->getJson("/api/meeting-types/{$this->type->id}/slots?" . http_build_query([
                'from' => Carbon::now('UTC')->addDays(3)->format('Y-m-d'),
                'to' => Carbon::now('UTC')->addDays(10)->format('Y-m-d'),
            ]));

        $response->assertStatus(403);
    }

    public function test_user_only_sees_own_meeting_types_in_index(): void
    {
        $otherType = MeetingType::create([
            'user_id' => $this->otherUser->id,
            'name' => 'Other Type',
            'description' => 'Not mine',
            'duration_minutes' => 30,
            'format' => MeetingType::FORMAT_GOOGLE_MEET,
            'buffer_minutes' => 0,
            'capacity' => 1,
            'is_active' => true,
            'sort_order' => 0,
            'min_notice_hours' => 2,
            'advance_booking_days' => 30,
        ]);

        $token = $this->host->createToken('test')->plainTextToken;

        $response = $this->withToken($token)
            ->getJson('/api/meeting-types');

        $response->assertStatus(200);

        $ids = collect($response->json('data'))->pluck('id')->toArray();
        $this->assertContains($this->type->id, $ids);
        $this->assertNotContains($otherType->id, $ids);
    }

    // ═══════════════════════════════════════════════════════════════════
    // IDOR PROTECTION — Bookings
    // ═══════════════════════════════════════════════════════════════════

    public function test_user_cannot_view_other_users_booking(): void
    {
        $booking = $this->createBookingForHost($this->host);
        $token = $this->otherUser->createToken('test')->plainTextToken;

        $response = $this->withToken($token)
            ->getJson("/api/meetings/{$booking->id}");

        $response->assertStatus(403);
    }

    public function test_user_cannot_confirm_other_users_booking(): void
    {
        $booking = $this->createBookingForHost($this->host);
        $token = $this->otherUser->createToken('test')->plainTextToken;

        $response = $this->withToken($token)
            ->patchJson("/api/meetings/{$booking->id}/confirm");

        $response->assertStatus(403);
    }

    public function test_user_cannot_decline_other_users_booking(): void
    {
        $booking = $this->createBookingForHost($this->host);
        $token = $this->otherUser->createToken('test')->plainTextToken;

        $response = $this->withToken($token)
            ->patchJson("/api/meetings/{$booking->id}/decline");

        $response->assertStatus(403);
    }

    public function test_user_cannot_cancel_other_users_booking(): void
    {
        $booking = $this->createBookingForHost($this->host);
        $token = $this->otherUser->createToken('test')->plainTextToken;

        $response = $this->withToken($token)
            ->patchJson("/api/meetings/{$booking->id}/cancel");

        $response->assertStatus(403);
    }

    public function test_user_cannot_download_ics_for_other_users_booking(): void
    {
        $booking = $this->createBookingForHost($this->host);
        $token = $this->otherUser->createToken('test')->plainTextToken;

        $response = $this->withToken($token)
            ->getJson("/api/meetings/{$booking->id}/ics");

        $response->assertStatus(403);
    }

    public function test_user_only_sees_own_bookings_in_index(): void
    {
        $hostBooking = $this->createBookingForHost($this->host);
        $otherBooking = $this->createBookingForHost($this->otherUser);

        $token = $this->host->createToken('test')->plainTextToken;

        $response = $this->withToken($token)
            ->getJson('/api/meetings');

        $response->assertStatus(200);

        $ids = collect($response->json('data'))->pluck('id')->toArray();
        $this->assertContains($hostBooking->id, $ids);
        $this->assertNotContains($otherBooking->id, $ids);
    }

    // ═══════════════════════════════════════════════════════════════════
    // IDOR PROTECTION — Blocked Dates
    // ═══════════════════════════════════════════════════════════════════

    public function test_user_cannot_delete_other_users_blocked_date(): void
    {
        $blockedDate = MeetingBlockedDate::create([
            'user_id' => $this->host->id,
            'start_date' => Carbon::now('UTC')->addDays(10)->format('Y-m-d'),
            'reason' => 'Vacation',
        ]);

        $token = $this->otherUser->createToken('test')->plainTextToken;

        $response = $this->withToken($token)
            ->deleteJson("/api/blocked-dates/{$blockedDate->id}");

        $response->assertStatus(403);

        $this->assertDatabaseHas('meeting_blocked_dates', ['id' => $blockedDate->id]);
    }

    public function test_user_only_sees_own_blocked_dates(): void
    {
        $hostBlocked = MeetingBlockedDate::create([
            'user_id' => $this->host->id,
            'start_date' => Carbon::now('UTC')->addDays(10)->format('Y-m-d'),
        ]);

        $otherBlocked = MeetingBlockedDate::create([
            'user_id' => $this->otherUser->id,
            'start_date' => Carbon::now('UTC')->addDays(11)->format('Y-m-d'),
        ]);

        $token = $this->host->createToken('test')->plainTextToken;

        $response = $this->withToken($token)
            ->getJson('/api/blocked-dates');

        $response->assertStatus(200);

        $ids = collect($response->json('data'))->pluck('id')->toArray();
        $this->assertContains($hostBlocked->id, $ids);
        $this->assertNotContains($otherBlocked->id, $ids);
    }

    // ═══════════════════════════════════════════════════════════════════
    // UNAUTHORIZED ACCESS — No Auth
    // ═══════════════════════════════════════════════════════════════════

    public function test_unauthenticated_user_cannot_list_meeting_types(): void
    {
        $response = $this->getJson('/api/meeting-types');
        $response->assertStatus(401);
    }

    public function test_unauthenticated_user_cannot_create_meeting_type(): void
    {
        $response = $this->postJson('/api/meeting-types', [
            'name' => 'Hacked',
            'duration_minutes' => 30,
            'format' => MeetingType::FORMAT_GOOGLE_MEET,
        ]);
        $response->assertStatus(401);
    }

    public function test_unauthenticated_user_cannot_list_bookings(): void
    {
        $response = $this->getJson('/api/meetings');
        $response->assertStatus(401);
    }

    public function test_unauthenticated_user_cannot_view_booking(): void
    {
        $booking = $this->createBookingForHost($this->host);

        $response = $this->getJson("/api/meetings/{$booking->id}");
        $response->assertStatus(401);
    }

    public function test_unauthenticated_user_cannot_list_blocked_dates(): void
    {
        $response = $this->getJson('/api/blocked-dates');
        $response->assertStatus(401);
    }

    // ═══════════════════════════════════════════════════════════════════
    // GUEST CANCELLATION TOKEN SECURITY
    // ═══════════════════════════════════════════════════════════════════

    public function test_invalid_token_returns_404(): void
    {
        $response = $this->postJson('/api/meetings/cancel/invalid-token-abc', [
            'reason' => 'Changed my mind',
        ]);

        $response->assertStatus(404)
            ->assertJson(['error' => 'Invalid or expired cancellation token.']);
    }

    public function test_token_from_different_booking_rejects(): void
    {
        $booking1 = $this->createBookingForHost($this->host);
        $booking2 = $this->createBookingForHost($this->otherUser);

        // Try to cancel booking2 using booking1's token
        $response = $this->postJson("/api/meetings/cancel/{$booking1->guest_cancellation_token}");

        $response->assertStatus(404);
        $this->assertDatabaseHas('meeting_bookings', [
            'id' => $booking2->id,
            'status' => MeetingBooking::STATUS_PENDING,
        ]);
    }

    public function test_cancelled_booking_cannot_be_cancelled_again(): void
    {
        $booking = $this->createBookingForHost($this->host);
        $token = $booking->guest_cancellation_token;

        // First cancellation
        $this->postJson("/api/meetings/cancel/{$token}");
        $this->assertDatabaseHas('meeting_bookings', [
            'id' => $booking->id,
            'status' => MeetingBooking::STATUS_CANCELLED,
        ]);

        // Second cancellation
        $response = $this->postJson("/api/meetings/cancel/{$token}");
        $response->assertStatus(404);
    }

    public function test_token_not_exposed_in_booking_api_response(): void
    {
        $booking = $this->createBookingForHost($this->host);
        $token = $this->host->createToken('test')->plainTextToken;

        $response = $this->withToken($token)
            ->getJson("/api/meetings/{$booking->id}");

        $response->assertStatus(200);
        $response->assertJsonMissing(['guest_cancellation_token' => $booking->guest_cancellation_token]);
    }

    public function test_token_not_exposed_in_booking_list(): void
    {
        $this->createBookingForHost($this->host);
        $token = $this->host->createToken('test')->plainTextToken;

        $response = $this->withToken($token)
            ->getJson('/api/meetings');

        $response->assertStatus(200);

        foreach ($response->json('data') as $booking) {
            $this->assertArrayNotHasKey('guest_cancellation_token', $booking);
        }
    }

    public function test_cancellation_response_does_not_leak_token(): void
    {
        $booking = $this->createBookingForHost($this->host);
        $token = $booking->guest_cancellation_token;

        $response = $this->postJson("/api/meetings/cancel/{$token}");

        $response->assertStatus(200);
        $response->assertJsonMissing(['guest_cancellation_token']);
        $this->assertArrayNotHasKey('guest_cancellation_token', $response->json('data'));
    }

    public function test_numeric_token_is_rejected(): void
    {
        $response = $this->postJson('/api/meetings/cancel/12345');
        $response->assertStatus(404);
    }

    public function test_empty_token_is_rejected(): void
    {
        $response = $this->postJson('/api/meetings/cancel/');
        // Empty token results in 404 or 405 (no route match)
        $this->assertContains($response->status(), [404, 405]);
    }

    public function test_booking_id_not_guessable_from_token(): void
    {
        // Booking IDs are sequential, but tokens are random 64-char strings
        // Verify that a token of "1" (guessable) doesn't match any booking
        $response = $this->postJson('/api/meetings/cancel/1');
        $response->assertStatus(404);
    }

    // ═══════════════════════════════════════════════════════════════════
    // PUBLIC ENDPOINT AUTHORIZATION
    // ═══════════════════════════════════════════════════════════════════

    public function test_public_meeting_types_only_returns_active_profile(): void
    {
        $this->profile->update(['is_live' => false]);

        $response = $this->getJson('/api/public/testhost/meeting-types');
        $response->assertStatus(404);
    }

    public function test_public_meeting_types_only_returns_active_types(): void
    {
        $this->type->update(['is_active' => false]);

        $response = $this->getJson('/api/public/testhost/meeting-types');
        $response->assertStatus(200);
        $this->assertEmpty($response->json('data'));
    }

    public function test_public_slots_requires_valid_profile(): void
    {
        $response = $this->getJson("/api/public/nonexistent/meeting-types/{$this->type->id}/slots?" . http_build_query([
            'from' => Carbon::now('UTC')->addDays(3)->format('Y-m-d'),
            'to' => Carbon::now('UTC')->addDays(10)->format('Y-m-d'),
        ]));

        $response->assertStatus(404);
    }

    public function test_public_book_requires_valid_profile(): void
    {
        $response = $this->postJson("/api/public/nonexistent/meeting-types/{$this->type->id}/book", [
            'guest_name' => 'Hacker',
            'guest_email' => 'hacker@evil.com',
            'start_time' => Carbon::now('UTC')->addDays(3)->setTime(14, 0)->toIso8601String(),
            'timezone' => 'America/New_York',
        ]);

        $response->assertStatus(404);
    }

    public function test_public_book_rejects_inactive_meeting_type(): void
    {
        $this->type->update(['is_active' => false]);

        $response = $this->postJson("/api/public/testhost/meeting-types/{$this->type->id}/book", [
            'guest_name' => 'Guest',
            'guest_email' => 'guest@example.com',
            'start_time' => Carbon::now('UTC')->addDays(3)->setTime(14, 0)->toIso8601String(),
            'timezone' => 'America/New_York',
        ]);

        $response->assertStatus(422);
    }

    public function test_guest_cannot_access_dashboard(): void
    {
        $response = $this->getJson('/api/dashboard');
        $response->assertStatus(401);
    }

    public function test_guest_cannot_access_notifications(): void
    {
        $response = $this->getJson('/api/notifications');
        $response->assertStatus(401);
    }

    // ═══════════════════════════════════════════════════════════════════
    // ADMIN AUTHORIZATION
    // ═══════════════════════════════════════════════════════════════════

    public function test_admin_can_access_stats_with_meetings(): void
    {
        $token = $this->admin->createToken('test')->plainTextToken;

        $response = $this->withToken($token)
            ->getJson('/api/admin/stats');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'total_meetings',
                'pending_meetings',
                'confirmed_meetings',
                'declined_meetings',
                'cancelled_meetings',
                'completed_meetings',
                'expired_meetings',
                'total_meeting_types',
                'active_meeting_types',
            ]);
    }

    public function test_non_admin_cannot_access_admin_stats(): void
    {
        $token = $this->host->createToken('test')->plainTextToken;

        $response = $this->withToken($token)
            ->getJson('/api/admin/stats');

        $response->assertStatus(403);
    }

    public function test_non_admin_cannot_access_admin_meetings(): void
    {
        $token = $this->host->createToken('test')->plainTextToken;

        $response = $this->withToken($token)
            ->getJson('/api/admin/meetings');

        $response->assertStatus(403);
    }

    public function test_admin_can_list_meetings(): void
    {
        $this->createBookingForHost($this->host);
        $token = $this->admin->createToken('test')->plainTextToken;

        $response = $this->withToken($token)
            ->getJson('/api/admin/meetings');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'status', 'guest_name', 'start_time'],
                ],
            ]);
    }

    public function test_admin_meetings_filter_by_status(): void
    {
        $booking = $this->createBookingForHost($this->host);
        app(BookingEngine::class)->confirmBooking($booking);

        $token = $this->admin->createToken('test')->plainTextToken;

        $confirmed = $this->withToken($token)
            ->getJson('/api/admin/meetings?status=confirmed');
        $confirmed->assertStatus(200);
        $this->assertCount(1, $confirmed->json('data'));

        $pending = $this->withToken($token)
            ->getJson('/api/admin/meetings?status=pending');
        $pending->assertStatus(200);
        $this->assertEmpty($pending->json('data'));
    }

    public function test_admin_meetings_filter_by_member(): void
    {
        $this->createBookingForHost($this->host);
        $this->createBookingForHost($this->otherUser);

        $token = $this->admin->createToken('test')->plainTextToken;

        $response = $this->withToken($token)
            ->getJson("/api/admin/meetings?member_id={$this->host->id}");

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
        $this->assertEquals($this->host->id, $response->json('data')[0]['host_user_id']);
    }

    public function test_admin_meetings_filter_by_date_range(): void
    {
        $booking = $this->createBookingForHost($this->host);

        $token = $this->admin->createToken('test')->plainTextToken;

        // Narrow range that should NOT include the booking
        $from = Carbon::now('UTC')->addDays(100)->format('Y-m-d');
        $to = Carbon::now('UTC')->addDays(101)->format('Y-m-d');
        $response = $this->withToken($token)
            ->getJson("/api/admin/meetings?from={$from}&to={$to}");

        $response->assertStatus(200);
        $this->assertEmpty($response->json('data'));
    }

    // ═══════════════════════════════════════════════════════════════════
    // CROSS-USER DATA LEAKAGE
    // ═══════════════════════════════════════════════════════════════════

    public function test_meeting_type_index_does_not_leak_other_users_data(): void
    {
        $otherType = MeetingType::create([
            'user_id' => $this->otherUser->id,
            'name' => 'Secret Meeting',
            'description' => 'Private info',
            'duration_minutes' => 30,
            'format' => MeetingType::FORMAT_GOOGLE_MEET,
            'buffer_minutes' => 0,
            'capacity' => 1,
            'is_active' => true,
            'sort_order' => 0,
            'min_notice_hours' => 2,
            'advance_booking_days' => 30,
        ]);

        $token = $this->host->createToken('test')->plainTextToken;

        $response = $this->withToken($token)
            ->getJson('/api/meeting-types');

        $response->assertStatus(200);
        $this->assertStringNotContainsString('Secret Meeting', $response->content());
    }

    public function test_booking_index_does_not_leak_other_users_data(): void
    {
        $otherBooking = $this->createBookingForHost($this->otherUser);

        $token = $this->host->createToken('test')->plainTextToken;

        $response = $this->withToken($token)
            ->getJson('/api/meetings');

        $response->assertStatus(200);
        $this->assertStringNotContainsString($otherBooking->guest_name, $response->content());
    }

    public function test_blocked_dates_index_does_not_leak_other_users_data(): void
    {
        MeetingBlockedDate::create([
            'user_id' => $this->otherUser->id,
            'start_date' => Carbon::now('UTC')->addDays(10)->format('Y-m-d'),
            'reason' => 'Secret vacation',
        ]);

        $token = $this->host->createToken('test')->plainTextToken;

        $response = $this->withToken($token)
            ->getJson('/api/blocked-dates');

        $response->assertStatus(200);
        $this->assertStringNotContainsString('Secret vacation', $response->content());
    }

    // ═══════════════════════════════════════════════════════════════════
    // MEETING TYPE OWNERSHIP ON CREATION
    // ═══════════════════════════════════════════════════════════════════

    public function test_created_meeting_type_belongs_to_authenticated_user(): void
    {
        $token = $this->host->createToken('test')->plainTextToken;

        $response = $this->withToken($token)
            ->postJson('/api/meeting-types', [
                'name' => 'My Meeting',
                'duration_minutes' => 30,
                'format' => MeetingType::FORMAT_GOOGLE_MEET,
            ]);

        $response->assertStatus(201);

        $typeId = $response->json('data.id');
        $this->assertDatabaseHas('meeting_types', [
            'id' => $typeId,
            'user_id' => $this->host->id,
        ]);
    }

    public function test_created_blocked_date_belongs_to_authenticated_user(): void
    {
        $token = $this->host->createToken('test')->plainTextToken;

        $response = $this->withToken($token)
            ->postJson('/api/blocked-dates', [
                'start_date' => Carbon::now('UTC')->addDays(10)->format('Y-m-d'),
            ]);

        $response->assertStatus(201);

        $dateId = $response->json('data.id');
        $this->assertDatabaseHas('meeting_blocked_dates', [
            'id' => $dateId,
            'user_id' => $this->host->id,
        ]);
    }

    // ═══════════════════════════════════════════════════════════════════
    // RESCHEDULE IDOR PROTECTION
    // ═══════════════════════════════════════════════════════════════════

    public function test_user_cannot_reschedule_other_users_booking(): void
    {
        $booking = $this->createBookingForHost($this->host);
        app(BookingEngine::class)->confirmBooking($booking);

        $token = $this->otherUser->createToken('test')->plainTextToken;

        $response = $this->withToken($token)
            ->postJson("/api/meetings/{$booking->id}/reschedule", [
                'proposed_start_time' => Carbon::now('UTC')->addDays(4)->setTime(15, 0)->toIso8601String(),
            ]);

        $response->assertStatus(403);
    }

    // ═══════════════════════════════════════════════════════════════════
    // EDGE CASES
    // ═══════════════════════════════════════════════════════════════════

    public function test_manipulated_booking_id_does_not_grant_access(): void
    {
        $booking = $this->createBookingForHost($this->host);
        $token = $this->otherUser->createToken('test')->plainTextToken;

        // Try to access with a very high ID (IDOR attempt)
        $response = $this->withToken($token)
            ->getJson('/api/meetings/999999');

        $response->assertStatus(403);
    }

    public function test_meeting_type_id_manipulation_rejected(): void
    {
        $token = $this->otherUser->createToken('test')->plainTextToken;

        $response = $this->withToken($token)
            ->getJson("/api/meeting-types/{$this->type->id}");

        $response->assertStatus(403);
    }

    public function test_meeting_booking_show_returns_only_booking_data(): void
    {
        $booking = $this->createBookingForHost($this->host);
        $token = $this->host->createToken('test')->plainTextToken;

        $response = $this->withToken($token)
            ->getJson("/api/meetings/{$booking->id}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'status',
                    'guest_name',
                    'guest_email',
                    'start_time',
                    'end_time',
                    'meeting_type',
                ],
            ]);

        // Should not contain internal fields
        $response->assertJsonMissing(['guest_cancellation_token']);
    }

    // ═══════════════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════════════

    protected function createBookingForHost(User $host): MeetingBooking
    {
        $type = $host->id === $this->host->id
            ? $this->type
            : MeetingType::create([
                'user_id' => $host->id,
                'name' => 'Test Type',
                'description' => 'Test',
                'duration_minutes' => 30,
                'format' => MeetingType::FORMAT_GOOGLE_MEET,
                'buffer_minutes' => 0,
                'capacity' => 1,
                'is_active' => true,
                'sort_order' => 0,
                'min_notice_hours' => 2,
                'advance_booking_days' => 30,
            ]);

        if ($host->id !== $this->host->id) {
            for ($day = 1; $day <= 5; $day++) {
                MeetingTypeAvailability::create([
                    'meeting_type_id' => $type->id,
                    'day_of_week' => $day,
                    'start_time' => '09:00',
                    'end_time' => '17:00',
                ]);
            }
        }

        $slotStart = Carbon::now('UTC')->addDays(3)->setTime(14, 0);

        return app(BookingEngine::class)->book(
            $type,
            'Guest User',
            'guest@example.com',
            $slotStart,
            'America/New_York'
        );
    }
}
