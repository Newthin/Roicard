<?php

namespace Tests\Feature;

use App\Models\MeetingBlockedDate;
use App\Models\MeetingBooking;
use App\Models\MeetingRescheduleRequest;
use App\Models\MeetingType;
use App\Models\MeetingTypeAvailability;
use App\Models\User;
use App\Services\AvailabilityEngine;
use App\Services\BookingEngine;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class AvailabilityEngineTest extends TestCase
{
    use RefreshDatabase;

    protected AvailabilityEngine $engine;
    protected User $host;
    protected MeetingType $type;

    protected function setUp(): void
    {
        parent::setUp();

        $this->engine = app(AvailabilityEngine::class);

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

        // Default availability: Mon-Fri 9:00-17:00 ET
        for ($day = 1; $day <= 5; $day++) {
            MeetingTypeAvailability::create([
                'meeting_type_id' => $this->type->id,
                'day_of_week' => $day,
                'start_time' => '09:00',
                'end_time' => '17:00',
            ]);
        }
    }

    // ─── Test 1: Normal availability ──────────────────────────────────────

    public function test_returns_slots_within_availability_window(): void
    {
        $from = Carbon::now('UTC')->addDays(3)->startOfDay();
        $to = $from->copy()->addDay();

        $slots = $this->engine->getAvailableSlots($this->type, $from, $to);

        $this->assertNotEmpty($slots);
        foreach ($slots as $slot) {
            $this->assertInstanceOf(Carbon::class, $slot['start']);
            $this->assertInstanceOf(Carbon::class, $slot['end']);
            $this->assertEquals(30, $slot['start']->diffInMinutes($slot['end']));
        }
    }

    // ─── Test 2: Multiple periods per day ─────────────────────────────────

    public function test_multiple_periods_per_day(): void
    {
        // Add morning and afternoon periods for Wednesday (day 3)
        MeetingTypeAvailability::where('meeting_type_id', $this->type->id)
            ->where('day_of_week', 3)->delete();

        MeetingTypeAvailability::create([
            'meeting_type_id' => $this->type->id,
            'day_of_week' => 3,
            'start_time' => '09:00',
            'end_time' => '12:00',
        ]);
        MeetingTypeAvailability::create([
            'meeting_type_id' => $this->type->id,
            'day_of_week' => 3,
            'start_time' => '14:00',
            'end_time' => '17:00',
        ]);

        // Find next Wednesday
        $wednesday = Carbon::now('UTC')->addWeek()->startOfWeek()->addDays(2);
        $from = $wednesday->copy()->startOfDay();
        $to = $wednesday->copy()->endOfDay();

        $slots = $this->engine->getAvailableSlots($this->type, $from, $to);

        $this->assertNotEmpty($slots);

        // Slots should be in two clusters: morning and afternoon
        $morningSlots = $slots->filter(fn ($s) => $s['start']->hour < 13);
        $afternoonSlots = $slots->filter(fn ($s) => $s['start']->hour >= 14);

        $this->assertNotEmpty($morningSlots, 'Should have morning slots');
        $this->assertNotEmpty($afternoonSlots, 'Should have afternoon slots');
    }

    // ─── Test 3: Duration ─────────────────────────────────────────────────

    public function test_slot_duration_matches_type(): void
    {
        $this->type->update(['duration_minutes' => 60]);

        $from = Carbon::now('UTC')->addDays(3)->startOfDay();
        $to = $from->copy()->addDay();

        $slots = $this->engine->getAvailableSlots($this->type, $from, $to);

        $this->assertNotEmpty($slots);
        foreach ($slots as $slot) {
            $this->assertEquals(60, $slot['start']->diffInMinutes($slot['end']));
        }
    }

    // ─── Test 4: Buffer ───────────────────────────────────────────────────

    public function test_buffer_creates_gap_between_slots(): void
    {
        $this->type->update(['buffer_minutes' => 10, 'duration_minutes' => 30]);

        $from = Carbon::now('UTC')->addDays(3)->startOfDay();
        $to = $from->copy()->addDay();

        $slots = $this->engine->getAvailableSlots($this->type, $from, $to);

        $this->assertNotEmpty($slots);
        // Each slot is 30 min, with 10 min buffer = 40 min step
        for ($i = 1; $i < $slots->count(); $i++) {
            $prev = $slots[$i - 1];
            $curr = $slots[$i];
            $gap = $prev['end']->diffInMinutes($curr['start']);
            $this->assertGreaterThanOrEqual(10, $gap, 'Buffer of 10 minutes between slots');
        }
    }

    // ─── Test 5: Minimum notice ──────────────────────────────────────────

    public function test_respects_minimum_notice(): void
    {
        $this->type->update(['min_notice_hours' => 24]);

        // Slots starting in the next 24 hours should be excluded
        $now = Carbon::now('UTC');
        $from = $now->copy()->addHours(1); // very soon
        $to = $now->copy()->addDays(7);

        $slots = $this->engine->getAvailableSlots($this->type, $from, $to);

        foreach ($slots as $slot) {
            $this->assertTrue(
                $slot['start']->gte($now->copy()->addHours(24)),
                "Slot {$slot['start']->toIso8601String()} should be at least 24h in the future"
            );
        }
    }

    // ─── Test 6: Advance booking window ──────────────────────────────────

    public function test_respects_advance_booking_window(): void
    {
        $this->type->update(['advance_booking_days' => 7]);

        $from = Carbon::now('UTC')->startOfDay();
        $to = $from->copy()->addDays(14);

        $slots = $this->engine->getAvailableSlots($this->type, $from, $to);

        $deadline = Carbon::now('UTC')->addDays(7)->endOfDay();
        foreach ($slots as $slot) {
            $this->assertTrue(
                $slot['start']->lte($deadline),
                "Slot {$slot['start']->toIso8601String()} should be within 7-day window"
            );
        }
    }

    // ─── Test 7: Blocked dates ───────────────────────────────────────────

    public function test_excludes_blocked_dates(): void
    {
        $blockedDate = Carbon::now('UTC')->addDays(5)->startOfDay();

        MeetingBlockedDate::create([
            'user_id' => $this->host->id,
            'start_date' => $blockedDate,
            'end_date' => $blockedDate,
            'reason' => 'Vacation',
        ]);

        $from = Carbon::now('UTC')->addDays(3)->startOfDay();
        $to = $from->copy()->addDays(7);

        $slots = $this->engine->getAvailableSlots($this->type, $from, $to);

        foreach ($slots as $slot) {
            $this->assertNotEquals(
                $blockedDate->toDateString(),
                $slot['start']->toDateString(),
                "No slots should be on blocked date {$blockedDate->toDateString()}"
            );
        }
    }

    // ─── Test 8: Existing meetings block slots ───────────────────────────

    public function test_existing_confirmed_meeting_blocks_slot(): void
    {
        $slotStart = Carbon::now('UTC')->addDays(3)->setTime(14, 0)->setTimezone('UTC');
        $slotEnd = $slotStart->copy()->addMinutes(30);

        MeetingBooking::create([
            'meeting_type_id' => $this->type->id,
            'host_user_id' => $this->host->id,
            'status' => MeetingBooking::STATUS_CONFIRMED,
            'guest_name' => 'Existing Guest',
            'guest_email' => 'existing@example.com',
            'guest_cancellation_token' => 'existingtoken123456789012345678901234567890123456789012345678',
            'start_time' => $slotStart,
            'end_time' => $slotEnd,
            'timezone' => 'America/New_York',
            'host_timezone' => 'America/New_York',
            'type_name' => '30-min Call',
            'type_duration_minutes' => 30,
            'type_format' => 'video',
        ]);

        $from = $slotStart->copy()->startOfDay();
        $to = $slotStart->copy()->endOfDay();

        $slots = $this->engine->getAvailableSlots($this->type, $from, $to);

        $conflicts = $slots->filter(fn ($s) =>
            $s['start']->lt($slotEnd) && $s['end']->gt($slotStart)
        );

        $this->assertTrue($conflicts->isEmpty(), 'No slots should overlap the existing booking');
    }

    // ─── Test 9: Active pending reservations block slots ─────────────────

    public function test_active_pending_booking_blocks_slot(): void
    {
        $slotStart = Carbon::now('UTC')->addDays(3)->setTime(10, 0)->setTimezone('UTC');
        $slotEnd = $slotStart->copy()->addMinutes(30);

        MeetingBooking::create([
            'meeting_type_id' => $this->type->id,
            'host_user_id' => $this->host->id,
            'status' => MeetingBooking::STATUS_PENDING,
            'guest_name' => 'Pending Guest',
            'guest_email' => 'pending@example.com',
            'guest_cancellation_token' => 'pendingtoken12345678901234567890123456789012345678901234567890',
            'start_time' => $slotStart,
            'end_time' => $slotEnd,
            'timezone' => 'America/New_York',
            'host_timezone' => 'America/New_York',
            'type_name' => '30-min Call',
            'type_duration_minutes' => 30,
            'type_format' => 'video',
        ]);

        $from = $slotStart->copy()->startOfDay();
        $to = $slotStart->copy()->endOfDay();

        $slots = $this->engine->getAvailableSlots($this->type, $from, $to);

        $conflicts = $slots->filter(fn ($s) =>
            $s['start']->lt($slotEnd) && $s['end']->gt($slotStart)
        );

        $this->assertTrue($conflicts->isEmpty(), 'Pending booking should block the slot');
    }

    // ─── Test 10: Expired pending reservations do NOT block ──────────────

    public function test_expired_pending_booking_does_not_block(): void
    {
        $slotStart = Carbon::now('UTC')->addDays(3)->setTime(10, 0)->setTimezone('UTC');
        $slotEnd = $slotStart->copy()->addMinutes(30);

        MeetingBooking::create([
            'meeting_type_id' => $this->type->id,
            'host_user_id' => $this->host->id,
            'status' => MeetingBooking::STATUS_EXPIRED,
            'guest_name' => 'Expired Guest',
            'guest_email' => 'expired@example.com',
            'guest_cancellation_token' => 'expiredtoken123456789012345678901234567890123456789012345678901',
            'start_time' => $slotStart,
            'end_time' => $slotEnd,
            'timezone' => 'America/New_York',
            'host_timezone' => 'America/New_York',
            'type_name' => '30-min Call',
            'type_duration_minutes' => 30,
            'type_format' => 'video',
        ]);

        $from = $slotStart->copy()->startOfDay();
        $to = $slotStart->copy()->endOfDay();

        $slots = $this->engine->getAvailableSlots($this->type, $from, $to);

        // The expired booking's slot should be available
        $available = $slots->filter(fn ($s) =>
            $s['start']->lte($slotStart) && $s['end']->gte($slotEnd)
        );

        $this->assertNotEmpty($available, 'Expired booking should NOT block the slot');
    }

    // ─── Test 11: Capacity ───────────────────────────────────────────────

    public function test_capacity_allows_multiple_bookings(): void
    {
        $this->type->update(['capacity' => 2]);

        $baseTime = Carbon::now('UTC')->addDays(3)->setTime(14, 0)->setTimezone('UTC');

        // First booking
        MeetingBooking::create([
            'meeting_type_id' => $this->type->id,
            'host_user_id' => $this->host->id,
            'status' => MeetingBooking::STATUS_CONFIRMED,
            'guest_name' => 'Guest 1',
            'guest_email' => 'guest1@example.com',
            'guest_cancellation_token' => Str::random(64),
            'start_time' => $baseTime,
            'end_time' => $baseTime->copy()->addMinutes(30),
            'timezone' => 'America/New_York',
            'host_timezone' => 'America/New_York',
            'type_name' => '30-min Call',
            'type_duration_minutes' => 30,
            'type_format' => 'video',
        ]);

        $from = $baseTime->copy()->startOfDay();
        $to = $baseTime->copy()->endOfDay();

        $slots = $this->engine->getAvailableSlots($this->type, $from, $to);

        // The same slot should still be available since capacity is 2
        $matchingSlot = $slots->filter(fn ($s) =>
            $s['start']->lte($baseTime) && $s['end']->gte($baseTime->copy()->addMinutes(30))
        );

        $this->assertNotEmpty($matchingSlot, 'Slot should be available with capacity 2 and only 1 booking');
    }

    public function test_capacity_blocks_when_full(): void
    {
        $this->type->update(['capacity' => 1]);

        $baseTime = Carbon::now('UTC')->addDays(3)->setTime(14, 0)->setTimezone('UTC');

        MeetingBooking::create([
            'meeting_type_id' => $this->type->id,
            'host_user_id' => $this->host->id,
            'status' => MeetingBooking::STATUS_CONFIRMED,
            'guest_name' => 'Guest 1',
            'guest_email' => 'guest1b@example.com',
            'guest_cancellation_token' => 'guest1btoken123456789012345678901234567890123456789012345678901',
            'start_time' => $baseTime,
            'end_time' => $baseTime->copy()->addMinutes(30),
            'timezone' => 'America/New_York',
            'host_timezone' => 'America/New_York',
            'type_name' => '30-min Call',
            'type_duration_minutes' => 30,
            'type_format' => 'video',
        ]);

        $from = $baseTime->copy()->startOfDay();
        $to = $baseTime->copy()->endOfDay();

        $slots = $this->engine->getAvailableSlots($this->type, $from, $to);

        $matchingSlot = $slots->filter(fn ($s) =>
            $s['start']->lte($baseTime) && $s['end']->gte($baseTime->copy()->addMinutes(30))
        );

        $this->assertTrue($matchingSlot->isEmpty(), 'Slot should be unavailable when capacity is reached');
    }

    // ─── Test 12: Maximum meetings per day ───────────────────────────────

    public function test_max_bookings_per_day_limits_slots(): void
    {
        $this->type->update(['max_bookings_per_day' => 1]);

        $day = Carbon::now('UTC')->addDays(3)->startOfDay();

        // Book one slot
        MeetingBooking::create([
            'meeting_type_id' => $this->type->id,
            'host_user_id' => $this->host->id,
            'status' => MeetingBooking::STATUS_CONFIRMED,
            'guest_name' => 'Guest Day',
            'guest_email' => 'guestd@example.com',
            'guest_cancellation_token' => 'guestdtoken12345678901234567890123456789012345678901234567890123',
            'start_time' => $day->copy()->setTime(10, 0),
            'end_time' => $day->copy()->setTime(10, 30),
            'timezone' => 'America/New_York',
            'host_timezone' => 'America/New_York',
            'type_name' => '30-min Call',
            'type_duration_minutes' => 30,
            'type_format' => 'video',
        ]);

        $slots = $this->engine->getAvailableSlots($this->type, $day, $day->copy()->endOfDay());

        $this->assertTrue($slots->isEmpty(), 'No slots should be available when max_per_day=1 and 1 booking exists');
    }

    // ─── Test 13: Timezone conversion ────────────────────────────────────

    public function test_slots_are_in_utc_regardless_of_host_timezone(): void
    {
        $this->host->update(['timezone' => 'Asia/Tokyo']);

        $from = Carbon::now('UTC')->addDays(3)->startOfDay();
        $to = $from->copy()->addDay();

        $slots = $this->engine->getAvailableSlots($this->type, $from, $to);

        $this->assertNotEmpty($slots);
        foreach ($slots as $slot) {
            $this->assertEquals('UTC', $slot['start']->timezoneName, 'Slot start should be in UTC');
            $this->assertEquals('UTC', $slot['end']->timezoneName, 'Slot end should be in UTC');
        }
    }

    // ─── Test 14: No availability returns empty ──────────────────────────

    public function test_no_availability_rules_returns_empty(): void
    {
        MeetingTypeAvailability::where('meeting_type_id', $this->type->id)->delete();

        $from = Carbon::now('UTC')->addDays(3)->startOfDay();
        $to = $from->copy()->addDay();

        $slots = $this->engine->getAvailableSlots($this->type, $from, $to);

        $this->assertTrue($slots->isEmpty());
    }

    // ─── Test 15: Inactive meeting type returns empty ────────────────────

    public function test_inactive_meeting_type_returns_empty(): void
    {
        $this->type->update(['is_active' => false]);

        $from = Carbon::now('UTC')->addDays(3)->startOfDay();
        $to = $from->copy()->addDay();

        $slots = $this->engine->getAvailableSlots($this->type, $from, $to);

        $this->assertTrue($slots->isEmpty());
    }

    // ─── Test 16: Weekend blocked when no weekend rules ─────────────────

    public function test_no_weekend_slots_when_only_weekday_rules(): void
    {
        $saturday = Carbon::now('UTC')->addWeek()->startOfWeek()->addDays(5)->startOfDay();
        $from = $saturday->copy();
        $to = $saturday->copy()->endOfDay();

        $slots = $this->engine->getAvailableSlots($this->type, $from, $to);

        $this->assertTrue($slots->isEmpty(), 'No slots on Saturday when only Mon-Fri rules exist');
    }

    // ─── Test 17: Blocked date range ─────────────────────────────────────

    public function test_blocked_date_range_covers_multiple_days(): void
    {
        $start = Carbon::now('UTC')->addDays(5)->startOfDay();
        $end = $start->copy()->addDays(3);

        MeetingBlockedDate::create([
            'user_id' => $this->host->id,
            'start_date' => $start,
            'end_date' => $end,
            'reason' => 'Holiday week',
        ]);

        $from = Carbon::now('UTC')->addDays(3)->startOfDay();
        $to = $from->copy()->addDays(7);

        $slots = $this->engine->getAvailableSlots($this->type, $from, $to);

        foreach ($slots as $slot) {
            $date = $slot['start']->toDateString();
            $this->assertFalse(
                $date >= $start->toDateString() && $date <= $end->toDateString(),
                "Slot on {$date} should be blocked"
            );
        }
    }

    // ─── Test 18: Reschedule reservation blocks slot ─────────────────────

    public function test_pending_reschedule_blocks_slot(): void
    {
        $baseTime = Carbon::now('UTC')->addDays(3)->setTime(14, 0)->setTimezone('UTC');

        $booking = MeetingBooking::create([
            'meeting_type_id' => $this->type->id,
            'host_user_id' => $this->host->id,
            'status' => MeetingBooking::STATUS_RESCHEDULE_REQUESTED,
            'guest_name' => 'Reschedule Guest',
            'guest_email' => 'resched@example.com',
            'guest_cancellation_token' => 'reschedtoken1234567890123456789012345678901234567890123456789012345',
            'start_time' => $baseTime->copy()->subHour(),
            'end_time' => $baseTime->copy()->subHour()->addMinutes(30),
            'timezone' => 'America/New_York',
            'host_timezone' => 'America/New_York',
            'type_name' => '30-min Call',
            'type_duration_minutes' => 30,
            'type_format' => 'video',
        ]);

        MeetingRescheduleRequest::create([
            'booking_id' => $booking->id,
            'requested_by_user_id' => $this->host->id,
            'proposed_start_time' => $baseTime,
            'proposed_end_time' => $baseTime->copy()->addMinutes(30),
            'status' => MeetingRescheduleRequest::STATUS_PENDING,
        ]);

        $from = $baseTime->copy()->startOfDay();
        $to = $baseTime->copy()->endOfDay();

        $slots = $this->engine->getAvailableSlots($this->type, $from, $to);

        $conflicts = $slots->filter(fn ($s) =>
            $s['start']->lt($baseTime->copy()->addMinutes(30)) &&
            $s['end']->gt($baseTime)
        );

        $this->assertTrue($conflicts->isEmpty(), 'Pending reschedule should block the proposed slot');
    }
}
