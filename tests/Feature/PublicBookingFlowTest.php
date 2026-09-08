<?php

namespace Tests\Feature;

use App\Models\MeetingBlockedDate;
use App\Models\MeetingBooking;
use App\Models\MeetingType;
use App\Models\MeetingTypeAvailability;
use App\Models\MeetingTypeCustomQuestion;
use App\Models\Profile;
use App\Models\User;
use App\Services\BookingEngine;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class PublicBookingFlowTest extends TestCase
{
    use RefreshDatabase;

    protected User $host;
    protected MeetingType $type;
    protected Profile $profile;

    protected function setUp(): void
    {
        parent::setUp();

        $this->host = User::factory()->create([
            'status' => 'active',
            'timezone' => 'America/New_York',
        ]);

        $this->profile = $this->host->profile()->create([
            'slug' => 'testmember',
            'is_live' => true,
            'title' => 'Test Member',
        ]);

        $this->type = MeetingType::create([
            'user_id' => $this->host->id,
            'name' => '30-min Consultation',
            'description' => 'Quick consultation call',
            'duration_minutes' => 30,
            'format' => MeetingType::FORMAT_GOOGLE_MEET,
            'location_detail' => null,
            'phone_number' => null,
            'meeting_link' => null,
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

    // ─── Test 1: Public profile includes meeting types ──────────────────

    public function test_public_profile_includes_meeting_types(): void
    {
        $response = $this->getJson('/api/public/testmember');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'meeting_types' => [
                    '*' => ['id', 'name', 'description', 'duration_minutes', 'format', 'format_label', 'custom_questions'],
                ],
            ]);

        $meetingTypes = $response->json('meeting_types');
        $this->assertCount(1, $meetingTypes);
        $this->assertEquals('30-min Consultation', $meetingTypes[0]['name']);
        $this->assertEquals('Google Meet', $meetingTypes[0]['format_label']);
    }

    // ─── Test 2: Get meeting types for booking flow ─────────────────────

    public function test_get_meeting_types_for_booking(): void
    {
        $response = $this->getJson('/api/public/testmember/meeting-types');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', '30-min Consultation');
    }

    // ─── Test 3: Get available slots ────────────────────────────────────

    public function test_get_available_slots(): void
    {
        $from = Carbon::now('UTC')->addDays(3)->startOfDay()->toDateString();
        $to = Carbon::now('UTC')->addDays(3)->endOfDay()->toDateString();

        $response = $this->getJson("/api/public/testmember/meeting-types/{$this->type->id}/slots?from={$from}&to={$to}");

        $response->assertStatus(200)
            ->assertJsonStructure(['data' => [['start', 'end']]]);
    }

    // ─── Test 4: Valid guest booking ───────────────────────────────────

    public function test_valid_guest_booking(): void
    {
        $slotStart = Carbon::now('UTC')->addDays(3)->setTime(14, 0);

        $response = $this->postJson("/api/public/testmember/meeting-types/{$this->type->id}/book", [
            'guest_name' => 'Jane Smith',
            'guest_email' => 'jane@example.com',
            'guest_phone' => '+1234567890',
            'guest_notes' => 'Looking forward to the meeting',
            'start_time' => $slotStart->toIso8601String(),
            'timezone' => 'America/New_York',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.guest_name', 'Jane Smith')
            ->assertJsonStructure(['data' => ['id', 'status', 'start_time', 'end_time', 'cancellation_url']]);

        $this->assertDatabaseHas('meeting_bookings', [
            'guest_email' => 'jane@example.com',
            'status' => 'pending',
        ]);
    }

    // ─── Test 5: Existing user booking sets guest_user_id ──────────────

    public function test_existing_user_booking_sets_guest_user_id(): void
    {
        $existingUser = User::factory()->create(['email' => 'member@example.com']);
        $slotStart = Carbon::now('UTC')->addDays(3)->setTime(14, 0);

        $response = $this->postJson("/api/public/testmember/meeting-types/{$this->type->id}/book", [
            'guest_name' => 'Existing Member',
            'guest_email' => 'member@example.com',
            'start_time' => $slotStart->toIso8601String(),
            'timezone' => 'America/New_York',
        ]);

        $response->assertStatus(201);

        $booking = MeetingBooking::where('guest_email', 'member@example.com')->first();
        $this->assertEquals($existingUser->id, $booking->guest_user_id);
    }

    // ─── Test 6: Invalid slot returns 409 ──────────────────────────────

    public function test_invalid_slot_returns_409(): void
    {
        $slotStart = Carbon::now('UTC')->addDays(3)->setTime(14, 0);

        // First booking
        $this->postJson("/api/public/testmember/meeting-types/{$this->type->id}/book", [
            'guest_name' => 'First Guest',
            'guest_email' => 'first@example.com',
            'start_time' => $slotStart->toIso8601String(),
            'timezone' => 'America/New_York',
        ]);

        // Second booking on same slot
        $response = $this->postJson("/api/public/testmember/meeting-types/{$this->type->id}/book", [
            'guest_name' => 'Second Guest',
            'guest_email' => 'second@example.com',
            'start_time' => $slotStart->toIso8601String(),
            'timezone' => 'America/New_York',
        ]);

        $response->assertStatus(409);
    }

    // ─── Test 7: Inactive meeting type returns 422 ─────────────────────

    public function test_inactive_meeting_type_returns_422(): void
    {
        $this->type->update(['is_active' => false]);
        $slotStart = Carbon::now('UTC')->addDays(3)->setTime(14, 0);

        $response = $this->postJson("/api/public/testmember/meeting-types/{$this->type->id}/book", [
            'guest_name' => 'Guest',
            'guest_email' => 'guest@example.com',
            'start_time' => $slotStart->toIso8601String(),
            'timezone' => 'America/New_York',
        ]);

        $response->assertStatus(422);
    }

    // ─── Test 8: Unauthorized meeting type access returns 404 ──────────

    public function test_unauthorized_meeting_type_access(): void
    {
        $otherHost = User::factory()->create(['status' => 'active']);
        $otherType = MeetingType::create([
            'user_id' => $otherHost->id,
            'name' => 'Other Type',
            'duration_minutes' => 30,
            'format' => MeetingType::FORMAT_IN_PERSON,
            'is_active' => true,
        ]);

        $slotStart = Carbon::now('UTC')->addDays(3)->setTime(14, 0);

        $response = $this->postJson("/api/public/testmember/meeting-types/{$otherType->id}/book", [
            'guest_name' => 'Guest',
            'guest_email' => 'guest@example.com',
            'start_time' => $slotStart->toIso8601String(),
            'timezone' => 'America/New_York',
        ]);

        $response->assertStatus(404);
    }

    // ─── Test 9: Custom questions — required answered ───────────────────

    public function test_custom_questions_required_answered(): void
    {
        $question = MeetingTypeCustomQuestion::create([
            'meeting_type_id' => $this->type->id,
            'question' => 'What is your budget?',
            'is_required' => true,
            'sort_order' => 0,
        ]);

        $slotStart = Carbon::now('UTC')->addDays(3)->setTime(14, 0);

        $response = $this->postJson("/api/public/testmember/meeting-types/{$this->type->id}/book", [
            'guest_name' => 'Guest',
            'guest_email' => 'guest@example.com',
            'start_time' => $slotStart->toIso8601String(),
            'timezone' => 'America/New_York',
            'custom_answers' => [
                ['question_id' => $question->id, 'answer' => '$5k'],
            ],
        ]);

        $response->assertStatus(201);

        $booking = MeetingBooking::where('guest_email', 'guest@example.com')->first();
        $this->assertCount(1, $booking->customAnswers);
        $this->assertEquals('What is your budget?', $booking->customAnswers[0]->question);
        $this->assertEquals('$5k', $booking->customAnswers[0]->answer);
    }

    // ─── Test 10: Custom questions — required missing returns 422 ──────

    public function test_custom_questions_required_missing(): void
    {
        $question = MeetingTypeCustomQuestion::create([
            'meeting_type_id' => $this->type->id,
            'question' => 'What is your budget?',
            'is_required' => true,
            'sort_order' => 0,
        ]);

        $slotStart = Carbon::now('UTC')->addDays(3)->setTime(14, 0);

        $response = $this->postJson("/api/public/testmember/meeting-types/{$this->type->id}/book", [
            'guest_name' => 'Guest',
            'guest_email' => 'guest@example.com',
            'start_time' => $slotStart->toIso8601String(),
            'timezone' => 'America/New_York',
            'custom_answers' => [], // required question not answered
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'All required questions must be answered.');
    }

    // ─── Test 11: Validation — missing required fields ─────────────────

    public function test_validation_missing_required_fields(): void
    {
        $response = $this->postJson("/api/public/testmember/meeting-types/{$this->type->id}/book", []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['guest_name', 'guest_email', 'start_time', 'timezone']);
    }

    // ─── Test 12: Guest cancellation ───────────────────────────────────

    public function test_guest_cancellation(): void
    {
        $slotStart = Carbon::now('UTC')->addDays(3)->setTime(14, 0);

        $response = $this->postJson("/api/public/testmember/meeting-types/{$this->type->id}/book", [
            'guest_name' => 'Cancelling Guest',
            'guest_email' => 'cancel@example.com',
            'start_time' => $slotStart->toIso8601String(),
            'timezone' => 'America/New_York',
        ]);

        $booking = MeetingBooking::where('guest_email', 'cancel@example.com')->first();
        $token = $booking->guest_cancellation_token;

        $cancelResponse = $this->postJson("/api/meetings/cancel/{$token}", [
            'reason' => 'Changed plans',
        ]);

        $cancelResponse->assertStatus(200)
            ->assertJsonPath('data.status', 'cancelled');

        $this->assertDatabaseHas('meeting_bookings', [
            'id' => $booking->id,
            'status' => 'cancelled',
            'cancelled_by' => 'guest',
        ]);
    }

    // ─── Test 13: Invalid cancellation token returns 404 ──────────────

    public function test_invalid_cancellation_token(): void
    {
        $response = $this->postJson('/api/meetings/cancel/invalidtoken123');

        $response->assertStatus(404);
    }

    // ─── Test 14: Nonexistent member returns 404 ──────────────────────

    public function test_nonexistent_member(): void
    {
        $response = $this->getJson('/api/public/nonexistent/meeting-types');

        $response->assertStatus(404);
    }

    // ─── Test 15: Inactive member profile returns 404 ─────────────────

    public function test_inactive_member_profile(): void
    {
        $this->host->update(['status' => 'inactive']);

        $response = $this->getJson('/api/public/testmember/meeting-types');

        $response->assertStatus(404);
    }

    // ─── Test 16: Phone meeting type ───────────────────────────────────

    public function test_phone_meeting_type_booking(): void
    {
        $phoneType = MeetingType::create([
            'user_id' => $this->host->id,
            'name' => 'Phone Call',
            'description' => 'Quick phone call',
            'duration_minutes' => 15,
            'format' => MeetingType::FORMAT_PHONE,
            'phone_number' => '+15551234567',
            'is_active' => true,
        ]);

        MeetingTypeAvailability::create([
            'meeting_type_id' => $phoneType->id,
            'day_of_week' => 1,
            'start_time' => '09:00',
            'end_time' => '17:00',
        ]);

        $slotStart = Carbon::now('UTC')->addDays(3)->setTime(14, 0);

        $response = $this->postJson("/api/public/testmember/meeting-types/{$phoneType->id}/book", [
            'guest_name' => 'Phone Guest',
            'guest_email' => 'phone@example.com',
            'start_time' => $slotStart->toIso8601String(),
            'timezone' => 'America/New_York',
        ]);

        $response->assertStatus(201);

        $booking = MeetingBooking::where('guest_email', 'phone@example.com')->first();
        $this->assertEquals(MeetingType::FORMAT_PHONE, $booking->type_format);
    }

    // ─── Test 17: In-person meeting type ───────────────────────────────

    public function test_in_person_meeting_type_booking(): void
    {
        $inPersonType = MeetingType::create([
            'user_id' => $this->host->id,
            'name' => 'In-Person Meeting',
            'description' => 'Face to face',
            'duration_minutes' => 60,
            'format' => MeetingType::FORMAT_IN_PERSON,
            'location_detail' => '123 Main St, Suite 100',
            'is_active' => true,
        ]);

        MeetingTypeAvailability::create([
            'meeting_type_id' => $inPersonType->id,
            'day_of_week' => 3,
            'start_time' => '10:00',
            'end_time' => '16:00',
        ]);

        $slotStart = Carbon::now('UTC')->addDays(3)->setTime(14, 0);

        $response = $this->postJson("/api/public/testmember/meeting-types/{$inPersonType->id}/book", [
            'guest_name' => 'InPerson Guest',
            'guest_email' => 'inperson@example.com',
            'start_time' => $slotStart->toIso8601String(),
            'timezone' => 'America/New_York',
        ]);

        $response->assertStatus(201);

        $booking = MeetingBooking::where('guest_email', 'inperson@example.com')->first();
        $this->assertEquals(MeetingType::FORMAT_IN_PERSON, $booking->type_format);
        $this->assertEquals('123 Main St, Suite 100', $booking->type_location_detail);
    }

    // ─── Test 18: Meeting type CRUD with custom questions ──────────────

    public function test_meeting_type_crud_with_custom_questions(): void
    {
        $this->actingAs($this->host);

        // Create with custom questions
        $response = $this->postJson('/api/meeting-types', [
            'name' => 'Discovery Call',
            'description' => 'Initial discovery',
            'duration_minutes' => 30,
            'format' => MeetingType::FORMAT_ZOOM,
            'meeting_link' => 'https://zoom.us/j/123456',
            'custom_questions' => [
                ['question' => 'Company name?', 'is_required' => true],
                ['question' => 'Budget range?', 'is_required' => false],
            ],
            'availability' => [
                ['day_of_week' => 1, 'start_time' => '09:00', 'end_time' => '17:00'],
            ],
        ]);

        $response->assertStatus(201);
        $typeId = $response->json('data.id');

        // Verify custom questions saved
        $this->assertDatabaseHas('meeting_type_custom_questions', [
            'meeting_type_id' => $typeId,
            'question' => 'Company name?',
            'is_required' => true,
        ]);

        // Read back
        $response = $this->getJson("/api/meeting-types/{$typeId}");
        $response->assertStatus(200)
            ->assertJsonCount(2, 'data.custom_questions');

        // Update custom questions
        $response = $this->patchJson("/api/meeting-types/{$typeId}", [
            'name' => 'Discovery Call Updated',
            'description' => 'Updated',
            'duration_minutes' => 45,
            'format' => MeetingType::FORMAT_ZOOM,
            'custom_questions' => [
                ['question' => 'New question?', 'is_required' => true],
            ],
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('meeting_type_custom_questions', [
            'meeting_type_id' => $typeId,
            'question' => 'New question?',
        ]);
        $this->assertDatabaseMissing('meeting_type_custom_questions', [
            'meeting_type_id' => $typeId,
            'question' => 'Company name?',
        ]);
    }

    // ─── Test 19: Blocked date prevents booking ────────────────────────

    public function test_blocked_date_prevents_booking(): void
    {
        $blockedDate = Carbon::now('UTC')->addDays(3)->startOfDay();

        MeetingBlockedDate::create([
            'user_id' => $this->host->id,
            'start_date' => $blockedDate,
            'end_date' => $blockedDate,
            'reason' => 'Out of office',
        ]);

        $slotStart = $blockedDate->copy()->setTime(14, 0);

        $response = $this->postJson("/api/public/testmember/meeting-types/{$this->type->id}/book", [
            'guest_name' => 'Guest',
            'guest_email' => 'guest@example.com',
            'start_time' => $slotStart->toIso8601String(),
            'timezone' => 'America/New_York',
        ]);

        $response->assertStatus(409);
    }

    // ─── Test 20: Guest format override ────────────────────────────────

    public function test_guest_format_override(): void
    {
        $slotStart = Carbon::now('UTC')->addDays(3)->setTime(14, 0);

        $response = $this->postJson("/api/public/testmember/meeting-types/{$this->type->id}/book", [
            'guest_name' => 'Format Guest',
            'guest_email' => 'format@example.com',
            'start_time' => $slotStart->toIso8601String(),
            'timezone' => 'America/New_York',
            'format' => MeetingType::FORMAT_PHONE,
        ]);

        $response->assertStatus(201);

        $booking = MeetingBooking::where('guest_email', 'format@example.com')->first();
        $this->assertEquals(MeetingType::FORMAT_PHONE, $booking->type_format);
    }
}
