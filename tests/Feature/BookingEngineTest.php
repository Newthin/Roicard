<?php

namespace Tests\Feature;

use App\Exceptions\SlotUnavailableException;
use App\Models\MeetingBooking;
use App\Models\MeetingRescheduleRequest;
use App\Models\MeetingType;
use App\Models\MeetingTypeAvailability;
use App\Models\User;
use App\Services\BookingEngine;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class BookingEngineTest extends TestCase
{
    use RefreshDatabase;

    protected BookingEngine $engine;
    protected User $host;
    protected MeetingType $type;

    protected function setUp(): void
    {
        parent::setUp();

        $this->engine = app(BookingEngine::class);

        $this->host = User::factory()->create([
            'status' => 'active',
            'timezone' => 'America/New_York',
        ]);

        $this->type = MeetingType::create([
            'user_id' => $this->host->id,
            'name' => '30-min Call',
            'description' => 'Quick call',
            'duration_minutes' => 30,
            'format' => 'video',
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

    // ─── Test 1: Successful booking ──────────────────────────────────────

    public function test_creates_booking_successfully(): void
    {
        $slotStart = Carbon::now('UTC')->addDays(3)->setTime(14, 0);

        $booking = $this->engine->book(
            $this->type,
            'John Doe',
            'john@example.com',
            $slotStart,
            'America/New_York',
            '+1234567890',
            'Looking forward to it'
        );

        $this->assertNotNull($booking);
        $this->assertEquals(MeetingBooking::STATUS_PENDING, $booking->status);
        $this->assertEquals('John Doe', $booking->guest_name);
        $this->assertEquals('john@example.com', $booking->guest_email);
        $this->assertEquals($slotStart, $booking->start_time);
        $this->assertEquals($slotStart->copy()->addMinutes(30), $booking->end_time);
        $this->assertNotNull($booking->guest_cancellation_token);
        $this->assertEquals('30-min Call', $booking->type_name);
        $this->assertEquals(30, $booking->type_duration_minutes);
    }

    // ─── Test 2: Double booking protection ──────────────────────────────

    public function test_prevents_double_booking(): void
    {
        $slotStart = Carbon::now('UTC')->addDays(3)->setTime(14, 0);

        // First booking
        $this->engine->book(
            $this->type,
            'First Guest',
            'first@example.com',
            $slotStart,
            'America/New_York'
        );

        // Second booking on same slot should throw
        $this->expectException(SlotUnavailableException::class);

        $this->engine->book(
            $this->type,
            'Second Guest',
            'second@example.com',
            $slotStart,
            'America/New_York'
        );
    }

    // ─── Test 3: Booking on inactive type fails ─────────────────────────

    public function test_booking_on_inactive_type_fails(): void
    {
        $this->type->update(['is_active' => false]);

        $slotStart = Carbon::now('UTC')->addDays(3)->setTime(14, 0);

        $this->expectException(SlotUnavailableException::class);

        $this->engine->book(
            $this->type,
            'Guest',
            'guest@example.com',
            $slotStart,
            'America/New_York'
        );
    }

    // ─── Test 4: Booking before minimum notice fails ────────────────────

    public function test_booking_before_minimum_notice_fails(): void
    {
        $this->type->update(['min_notice_hours' => 24]);

        // Try to book 5 hours from now (within 24h notice)
        $slotStart = Carbon::now('UTC')->addHours(5)->setTime(
            Carbon::now('UTC')->addHours(5)->hour,
            0
        );

        $this->expectException(SlotUnavailableException::class);

        $this->engine->book(
            $this->type,
            'Guest',
            'guest@example.com',
            $slotStart,
            'America/New_York'
        );
    }

    // ─── Test 5: Booking beyond advance window fails ────────────────────

    public function test_booking_beyond_advance_window_fails(): void
    {
        $this->type->update(['advance_booking_days' => 7]);

        $slotStart = Carbon::now('UTC')->addDays(10)->setTime(14, 0);

        $this->expectException(SlotUnavailableException::class);

        $this->engine->book(
            $this->type,
            'Guest',
            'guest@example.com',
            $slotStart,
            'America/New_York'
        );
    }

    // ─── Test 6: Booking on blocked date fails ──────────────────────────

    public function test_booking_on_blocked_date_fails(): void
    {
        $blockedDate = Carbon::now('UTC')->addDays(3)->startOfDay();

        \App\Models\MeetingBlockedDate::create([
            'user_id' => $this->host->id,
            'start_date' => $blockedDate,
            'end_date' => $blockedDate,
            'reason' => 'Vacation',
        ]);

        $slotStart = $blockedDate->copy()->setTime(14, 0);

        $this->expectException(SlotUnavailableException::class);

        $this->engine->book(
            $this->type,
            'Guest',
            'guest@example.com',
            $slotStart,
            'America/New_York'
        );
    }

    // ─── Test 7: Capacity check during booking ─────────────────────────

    public function test_booking_respects_capacity(): void
    {
        $this->type->update(['capacity' => 1]);
        $slotStart = Carbon::now('UTC')->addDays(3)->setTime(14, 0);

        // Existing confirmed booking
        MeetingBooking::create([
            'meeting_type_id' => $this->type->id,
            'host_user_id' => $this->host->id,
            'status' => MeetingBooking::STATUS_CONFIRMED,
            'guest_name' => 'Existing',
            'guest_email' => 'existing@example.com',
            'guest_cancellation_token' => Str::random(64),
            'start_time' => $slotStart,
            'end_time' => $slotStart->copy()->addMinutes(30),
            'timezone' => 'America/New_York',
            'host_timezone' => 'America/New_York',
            'type_name' => '30-min Call',
            'type_duration_minutes' => 30,
            'type_format' => 'video',
        ]);

        $this->expectException(SlotUnavailableException::class);

        $this->engine->book(
            $this->type,
            'New Guest',
            'new@example.com',
            $slotStart,
            'America/New_York'
        );
    }

    // ─── Test 8: Confirm booking ────────────────────────────────────────

    public function test_confirm_booking(): void
    {
        $booking = $this->createPendingBooking();

        $confirmed = $this->engine->confirmBooking($booking);

        $this->assertEquals(MeetingBooking::STATUS_CONFIRMED, $confirmed->status);
        $this->assertNotNull($confirmed->confirmed_at);
    }

    // ─── Test 9: Decline booking ────────────────────────────────────────

    public function test_decline_booking(): void
    {
        $booking = $this->createPendingBooking();

        $declined = $this->engine->declineBooking($booking, 'Not available');

        $this->assertEquals(MeetingBooking::STATUS_DECLINED, $declined->status);
        $this->assertEquals('Not available', $declined->cancellation_reason);
        $this->assertEquals('host', $declined->cancelled_by);
    }

    // ─── Test 10: Cancel booking by host ────────────────────────────────

    public function test_cancel_booking_by_host(): void
    {
        $booking = $this->createPendingBooking();

        $cancelled = $this->engine->cancelBookingByHost($booking, 'Changed plans');

        $this->assertEquals(MeetingBooking::STATUS_CANCELLED, $cancelled->status);
        $this->assertEquals('host', $cancelled->cancelled_by);
    }

    // ─── Test 11: Cancel booking by guest ───────────────────────────────

    public function test_cancel_booking_by_guest(): void
    {
        $booking = $this->createPendingBooking();
        $token = $booking->guest_cancellation_token;

        $cancelled = $this->engine->cancelBookingByGuest($token);

        $this->assertEquals(MeetingBooking::STATUS_CANCELLED, $cancelled->status);
        $this->assertEquals('guest', $cancelled->cancelled_by);
    }

    // ─── Test 12: Propose reschedule validates slot ─────────────────────

    public function test_propose_reschedule_validates_slot(): void
    {
        $booking = $this->createPendingBooking();

        // Propose a slot that conflicts with the existing booking
        $this->expectException(SlotUnavailableException::class);

        $this->engine->proposeReschedule(
            $booking,
            $this->host->id,
            $booking->start_time,
            'Need to move'
        );
    }

    // ─── Test 13: Accept reschedule moves booking ──────────────────────

    public function test_accept_reschedule_moves_booking(): void
    {
        $booking = $this->createPendingBooking();

        $newStart = $booking->start_time->copy()->addDays(1);
        $newEnd = $newStart->copy()->addMinutes(30);

        $request = $this->engine->proposeReschedule(
            $booking,
            $this->host->id,
            $newStart,
            'Need to move'
        );

        $this->assertEquals(MeetingBooking::STATUS_RESCHEDULE_REQUESTED, $booking->fresh()->status);

        $updatedBooking = $this->engine->acceptReschedule($request);

        $this->assertEquals(MeetingBooking::STATUS_CONFIRMED, $updatedBooking->status);
        $this->assertEquals($newStart, $updatedBooking->start_time);
        $this->assertEquals($newEnd, $updatedBooking->end_time);
    }

    // ─── Test 14: Decline reschedule reverts status ────────────────────

    public function test_decline_reschedule_reverts_status(): void
    {
        $booking = $this->createPendingBooking();

        $request = $this->engine->proposeReschedule(
            $booking,
            $this->host->id,
            $booking->start_time->copy()->addDays(1),
            'Need to move'
        );

        $this->engine->declineReschedule($request);

        $this->assertEquals(MeetingBooking::STATUS_CONFIRMED, $booking->fresh()->status);
    }

    // ─── Test 15: Expire pending bookings ──────────────────────────────

    public function test_expire_pending_bookings(): void
    {
        // Create a past pending booking
        MeetingBooking::create([
            'meeting_type_id' => $this->type->id,
            'host_user_id' => $this->host->id,
            'status' => MeetingBooking::STATUS_PENDING,
            'guest_name' => 'Past Guest',
            'guest_email' => 'past@example.com',
            'guest_cancellation_token' => Str::random(64),
            'start_time' => Carbon::now('UTC')->subDay(),
            'end_time' => Carbon::now('UTC')->subDay()->addMinutes(30),
            'timezone' => 'America/New_York',
            'host_timezone' => 'America/New_York',
            'type_name' => '30-min Call',
            'type_duration_minutes' => 30,
            'type_format' => 'video',
        ]);

        $expired = $this->engine->expirePendingBookings();

        $this->assertEquals(1, $expired);
    }

    // ─── Test 16: Cancelled booking opens slot ─────────────────────────

    public function test_cancelled_booking_frees_slot(): void
    {
        $slotStart = Carbon::now('UTC')->addDays(3)->setTime(14, 0);

        // Book and cancel
        $booking = $this->engine->book(
            $this->type,
            'Cancelling Guest',
            'cancel@example.com',
            $slotStart,
            'America/New_York'
        );

        $this->engine->cancelBookingByHost($booking);

        // Should be able to book the same slot again
        $newBooking = $this->engine->book(
            $this->type,
            'New Guest',
            'new@example.com',
            $slotStart,
            'America/New_York'
        );

        $this->assertNotNull($newBooking);
        $this->assertNotEquals($booking->id, $newBooking->id);
    }

    // ─── Test 17: Custom answers saved ─────────────────────────────────

    public function test_custom_answers_are_saved(): void
    {
        $slotStart = Carbon::now('UTC')->addDays(3)->setTime(14, 0);

        $booking = $this->engine->book(
            $this->type,
            'Guest',
            'guest@example.com',
            $slotStart,
            'America/New_York',
            null,
            null,
            [
                ['question' => 'What is your budget?', 'answer' => '$5k'],
                ['question' => 'Preferred time?', 'answer' => 'Morning'],
            ]
        );

        $this->assertCount(2, $booking->customAnswers);
        $this->assertEquals('What is your budget?', $booking->customAnswers[0]->question);
        $this->assertEquals('$5k', $booking->customAnswers[0]->answer);
    }

    // ─── Test 18: Snapshot preserves type details ──────────────────────

    public function test_booking_snapshot_preserves_type_details(): void
    {
        $slotStart = Carbon::now('UTC')->addDays(3)->setTime(14, 0);

        $booking = $this->engine->book(
            $this->type,
            'Guest',
            'guest@example.com',
            $slotStart,
            'America/New_York'
        );

        $this->assertEquals('30-min Call', $booking->type_name);
        $this->assertEquals('Quick call', $booking->type_description);
        $this->assertEquals(30, $booking->type_duration_minutes);
        $this->assertEquals('video', $booking->type_format);
    }

    // ─── Helpers ────────────────────────────────────────────────────────

    private function createPendingBooking(): MeetingBooking
    {
        $slotStart = Carbon::now('UTC')->addDays(3)->setTime(14, 0);

        return $this->engine->book(
            $this->type,
            'Pending Guest',
            'pending@example.com',
            $slotStart,
            'America/New_York'
        );
    }
}
