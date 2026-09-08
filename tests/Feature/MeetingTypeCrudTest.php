<?php

namespace Tests\Feature;

use App\Models\MeetingBooking;
use App\Models\MeetingType;
use App\Models\MeetingTypeAvailability;
use App\Models\MeetingTypeCustomQuestion;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class MeetingTypeCrudTest extends TestCase
{
    use RefreshDatabase;

    protected User $host;

    protected function setUp(): void
    {
        parent::setUp();

        $this->host = User::factory()->create([
            'status' => 'active',
            'timezone' => 'America/New_York',
        ]);
    }

    // ─── Test 1: Create meeting type with all fields ───────────────────

    public function test_create_meeting_type_with_all_fields(): void
    {
        $this->actingAs($this->host);

        $response = $this->postJson('/api/meeting-types', [
            'name' => 'Strategy Session',
            'description' => 'Deep dive strategy',
            'duration_minutes' => 60,
            'format' => MeetingType::FORMAT_IN_PERSON,
            'location_detail' => '456 Oak Ave',
            'phone_number' => '+15559876543',
            'meeting_link' => 'https://meet.google.com/abc-defg',
            'buffer_minutes' => 15,
            'capacity' => 3,
            'is_active' => true,
            'sort_order' => 1,
            'min_notice_hours' => 24,
            'advance_booking_days' => 14,
            'max_bookings_per_day' => 5,
            'availability' => [
                ['day_of_week' => 1, 'start_time' => '10:00', 'end_time' => '16:00'],
                ['day_of_week' => 3, 'start_time' => '10:00', 'end_time' => '16:00'],
            ],
            'custom_questions' => [
                ['question' => 'What challenge are you facing?', 'is_required' => true],
                ['question' => 'Preferred meeting format?', 'is_required' => false],
            ],
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.name', 'Strategy Session')
            ->assertJsonCount(2, 'data.availability')
            ->assertJsonCount(2, 'data.custom_questions');

        $this->assertDatabaseHas('meeting_types', [
            'name' => 'Strategy Session',
            'format' => MeetingType::FORMAT_IN_PERSON,
            'location_detail' => '456 Oak Ave',
            'phone_number' => '+15559876543',
            'meeting_link' => 'https://meet.google.com/abc-defg',
            'min_notice_hours' => 24,
            'advance_booking_days' => 14,
            'max_bookings_per_day' => 5,
        ]);
    }

    // ─── Test 2: List meeting types ────────────────────────────────────

    public function test_list_meeting_types(): void
    {
        MeetingType::create([
            'user_id' => $this->host->id,
            'name' => 'Type A',
            'duration_minutes' => 15,
            'format' => MeetingType::FORMAT_PHONE,
            'is_active' => true,
        ]);

        MeetingType::create([
            'user_id' => $this->host->id,
            'name' => 'Type B',
            'duration_minutes' => 30,
            'format' => MeetingType::FORMAT_ZOOM,
            'is_active' => false,
        ]);

        $this->actingAs($this->host);

        $response = $this->getJson('/api/meeting-types');

        $response->assertStatus(200)
            ->assertJsonCount(2, 'data');
    }

    // ─── Test 3: Update meeting type ───────────────────────────────────

    public function test_update_meeting_type(): void
    {
        $type = MeetingType::create([
            'user_id' => $this->host->id,
            'name' => 'Old Name',
            'duration_minutes' => 15,
            'format' => MeetingType::FORMAT_PHONE,
            'is_active' => true,
        ]);

        $this->actingAs($this->host);

        $response = $this->patchJson("/api/meeting-types/{$type->id}", [
            'name' => 'New Name',
            'description' => 'Updated description',
            'duration_minutes' => 45,
            'format' => MeetingType::FORMAT_GOOGLE_MEET,
            'meeting_link' => 'https://meet.google.com/new-link',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.name', 'New Name');

        $this->assertDatabaseHas('meeting_types', [
            'id' => $type->id,
            'name' => 'New Name',
            'format' => MeetingType::FORMAT_GOOGLE_MEET,
        ]);
    }

    // ─── Test 4: Delete meeting type without active bookings ───────────

    public function test_delete_meeting_type_without_bookings(): void
    {
        $type = MeetingType::create([
            'user_id' => $this->host->id,
            'name' => 'Deletable',
            'duration_minutes' => 15,
            'format' => MeetingType::FORMAT_PHONE,
            'is_active' => true,
        ]);

        $this->actingAs($this->host);

        $response = $this->deleteJson("/api/meeting-types/{$type->id}");

        $response->assertStatus(204);
        $this->assertDatabaseMissing('meeting_types', ['id' => $type->id]);
    }

    // ─── Test 5: Cannot delete meeting type with active bookings ───────

    public function test_cannot_delete_with_active_bookings(): void
    {
        $type = MeetingType::create([
            'user_id' => $this->host->id,
            'name' => 'Has Bookings',
            'duration_minutes' => 30,
            'format' => MeetingType::FORMAT_ZOOM,
            'is_active' => true,
        ]);

        MeetingBooking::create([
            'meeting_type_id' => $type->id,
            'host_user_id' => $this->host->id,
            'status' => MeetingBooking::STATUS_PENDING,
            'guest_name' => 'Guest',
            'guest_email' => 'guest@test.com',
            'guest_cancellation_token' => Str::random(64),
            'start_time' => Carbon::now('UTC')->addDays(3),
            'end_time' => Carbon::now('UTC')->addDays(3)->addMinutes(30),
            'timezone' => 'America/New_York',
            'type_name' => 'Has Bookings',
            'type_duration_minutes' => 30,
            'type_format' => MeetingType::FORMAT_ZOOM,
        ]);

        $this->actingAs($this->host);

        $response = $this->deleteJson("/api/meeting-types/{$type->id}");

        $response->assertStatus(422);
    }

    // ─── Test 6: Get available slots ───────────────────────────────────

    public function test_get_available_slots(): void
    {
        $type = MeetingType::create([
            'user_id' => $this->host->id,
            'name' => 'Slotted',
            'duration_minutes' => 30,
            'format' => MeetingType::FORMAT_PHONE,
            'is_active' => true,
            'min_notice_hours' => 2,
        ]);

        MeetingTypeAvailability::create([
            'meeting_type_id' => $type->id,
            'day_of_week' => 1,
            'start_time' => '09:00',
            'end_time' => '17:00',
        ]);

        $this->actingAs($this->host);

        $from = Carbon::now('UTC')->addDays(3)->startOfDay()->toDateString();
        $to = Carbon::now('UTC')->addDays(3)->endOfDay()->toDateString();

        $response = $this->getJson("/api/meeting-types/{$type->id}/slots?from={$from}&to={$to}");

        $response->assertStatus(200)
            ->assertJsonStructure(['data' => [['start', 'end']]]);
    }

    // ─── Test 7: Format validation ─────────────────────────────────────

    public function test_format_validation(): void
    {
        $this->actingAs($this->host);

        $response = $this->postJson('/api/meeting-types', [
            'name' => 'Bad Format',
            'duration_minutes' => 30,
            'format' => 'invalid_format',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['format']);
    }

    // ─── Test 8: Duration validation ───────────────────────────────────

    public function test_duration_validation(): void
    {
        $this->actingAs($this->host);

        $response = $this->postJson('/api/meeting-types', [
            'name' => 'Bad Duration',
            'duration_minutes' => 20,
            'format' => MeetingType::FORMAT_PHONE,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['duration_minutes']);
    }

    // ─── Test 9: Custom questions limited to 3 ────────────────────────

    public function test_custom_questions_limited_to_3(): void
    {
        $this->actingAs($this->host);

        $response = $this->postJson('/api/meeting-types', [
            'name' => 'Too Many Questions',
            'duration_minutes' => 30,
            'format' => MeetingType::FORMAT_PHONE,
            'custom_questions' => [
                ['question' => 'Q1'],
                ['question' => 'Q2'],
                ['question' => 'Q3'],
                ['question' => 'Q4'],
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['custom_questions']);
    }

    // ─── Test 10: Unauthenticated access denied ───────────────────────

    public function test_unauthenticated_access_denied(): void
    {
        $response = $this->getJson('/api/meeting-types');

        $response->assertStatus(401);
    }

    // ─── Test 11: Cannot access other user's meeting type ─────────────

    public function test_cannot_access_other_users_meeting_type(): void
    {
        $otherHost = User::factory()->create(['status' => 'active']);
        $otherType = MeetingType::create([
            'user_id' => $otherHost->id,
            'name' => 'Other',
            'duration_minutes' => 30,
            'format' => MeetingType::FORMAT_PHONE,
            'is_active' => true,
        ]);

        $this->actingAs($this->host);

        $response = $this->getJson("/api/meeting-types/{$otherType->id}");

        $response->assertStatus(403);
    }

    // ─── Test 12: Multiple formats support ─────────────────────────────

    public function test_all_formats_are_supported(): void
    {
        $this->actingAs($this->host);

        foreach (MeetingType::FORMATS as $format) {
            $response = $this->postJson('/api/meeting-types', [
                'name' => "Type {$format}",
                'duration_minutes' => 30,
                'format' => $format,
            ]);

            $response->assertStatus(201);
        }

        $this->assertCount(count(MeetingType::FORMATS), MeetingType::where('user_id', $this->host->id)->get());
    }
}
