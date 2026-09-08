<?php

namespace Tests\Feature;

use App\Jobs\SendMeetingReminderJob;
use App\Mail\GuestMeetingMail;
use App\Models\MeetingBooking;
use App\Models\MeetingType;
use App\Models\MeetingTypeAvailability;
use App\Models\User;
use App\Services\BookingEngine;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class GuestNotificationTest extends TestCase
{
    use RefreshDatabase;

    protected BookingEngine $engine;
    protected User $host;
    protected MeetingType $type;

    protected function setUp(): void
    {
        parent::setUp();

        Role::create(['name' => 'member', 'guard_name' => 'web']);

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

    // ─── Guest email notifications (non-registered guest) ───────────────

    public function test_booking_sends_email_to_non_registered_guest(): void
    {
        Mail::fake();

        $booking = $this->createPendingNonRegisteredBooking();

        Mail::assertSent(GuestMeetingMail::class, function ($mail) {
            return $mail->hasTo('jane@example.com');
        });
    }

    public function test_booking_does_not_send_email_to_registered_guest(): void
    {
        Mail::fake();

        $guest = User::factory()->create([
            'status' => 'active',
            'timezone' => 'America/Chicago',
        ]);

        $slotStart = Carbon::now('UTC')->addDays(3)->setTime(14, 0);

        $this->engine->book(
            $this->type,
            $guest->first_name . ' ' . $guest->last_name,
            $guest->email,
            $slotStart,
            $guest->timezone,
            null,
            null,
            null,
            $guest->id
        );

        Mail::assertNothingSent();
    }

    public function test_confirm_sends_email_to_non_registered_guest(): void
    {
        Mail::fake();

        $booking = $this->createPendingNonRegisteredBooking();
        $this->engine->confirmBooking($booking);

        // ICS attachment is handled by the same IcsService used by host notifications (tested in MeetingNotificationsTest).
        Mail::assertSent(GuestMeetingMail::class, function ($mail) {
            return $mail->hasTo('jane@example.com');
        });
    }

    public function test_decline_sends_email_to_non_registered_guest(): void
    {
        Mail::fake();

        $booking = $this->createPendingNonRegisteredBooking();
        $this->engine->confirmBooking($booking);
        $this->engine->declineBooking($booking, 'Schedule conflict');

        Mail::assertSent(GuestMeetingMail::class, function ($mail) {
            return $mail->hasTo('jane@example.com');
        });
    }

    public function test_cancel_by_host_sends_email_to_non_registered_guest(): void
    {
        Mail::fake();

        $booking = $this->createPendingNonRegisteredBooking();
        $this->engine->confirmBooking($booking);
        $this->engine->cancelBookingByHost($booking, 'Emergency');

        Mail::assertSent(GuestMeetingMail::class, function ($mail) {
            return $mail->hasTo('jane@example.com');
        });
    }

    public function test_cancel_by_guest_sends_email_to_non_registered_guest(): void
    {
        Mail::fake();

        $booking = $this->createPendingNonRegisteredBooking();
        $token = $booking->guest_cancellation_token;

        $this->engine->cancelBookingByGuest($token, 'Changed plans');

        Mail::assertSent(GuestMeetingMail::class, function ($mail) {
            return $mail->hasTo('jane@example.com');
        });
    }

    public function test_propose_reschedule_sends_email_to_non_registered_guest(): void
    {
        Mail::fake();

        $booking = $this->createPendingNonRegisteredBooking();
        $this->engine->confirmBooking($booking);

        $newStart = $this->getFutureWeekday(2)->setTime(15, 0);
        $this->engine->proposeReschedule($booking, $this->host->id, $newStart, 'Need to shift');

        Mail::assertSent(GuestMeetingMail::class, function ($mail) {
            return $mail->hasTo('jane@example.com');
        });
    }

    public function test_accept_reschedule_sends_email_to_non_registered_guest(): void
    {
        Mail::fake();

        $booking = $this->createPendingNonRegisteredBooking();
        $this->engine->confirmBooking($booking);

        $newStart = $this->getFutureWeekday(2)->setTime(15, 0);
        $request = $this->engine->proposeReschedule($booking, $this->host->id, $newStart);

        $this->engine->acceptReschedule($request);

        Mail::assertSent(GuestMeetingMail::class, function ($mail) {
            return $mail->hasTo('jane@example.com');
        });
    }

    public function test_decline_reschedule_sends_email_to_non_registered_guest(): void
    {
        Mail::fake();

        $booking = $this->createPendingNonRegisteredBooking();
        $this->engine->confirmBooking($booking);

        $newStart = $this->getFutureWeekday(2)->setTime(15, 0);
        $request = $this->engine->proposeReschedule($booking, $this->host->id, $newStart);

        $this->engine->declineReschedule($request);

        Mail::assertSent(GuestMeetingMail::class, function ($mail) {
            return $mail->hasTo('jane@example.com');
        });
    }

    // ─── Guest reminders ───────────────────────────────────────────────

    public function test_reminder_job_sends_email_to_non_registered_guest(): void
    {
        Mail::fake();

        $booking = $this->createPendingNonRegisteredBooking();
        $this->engine->confirmBooking($booking);
        $booking->update(['start_time' => Carbon::now('UTC')->addHours(24)]);

        $job = new SendMeetingReminderJob($booking, '24h');
        $job->handle();

        Mail::assertSent(GuestMeetingMail::class, function ($mail) {
            return $mail->hasTo('jane@example.com');
        });
    }

    public function test_reminder_1h_sends_email_to_non_registered_guest(): void
    {
        Mail::fake();

        $booking = $this->createPendingNonRegisteredBooking();
        $this->engine->confirmBooking($booking);
        $booking->update(['start_time' => Carbon::now('UTC')->addHours(1)]);

        $job = new SendMeetingReminderJob($booking, '1h');
        $job->handle();

        Mail::assertSent(GuestMeetingMail::class, function ($mail) {
            return $mail->hasTo('jane@example.com');
        });
    }

    public function test_reminder_does_not_send_for_cancelled_booking(): void
    {
        Mail::fake();

        $booking = $this->createPendingNonRegisteredBooking();
        $this->engine->confirmBooking($booking);
        $this->engine->cancelBookingByHost($booking);
        $booking->update(['start_time' => Carbon::now('UTC')->addHours(24)]);

        Mail::fake(['since' => now()]);

        $job = new SendMeetingReminderJob($booking, '24h');
        $job->handle();

        Mail::assertNothingSent();
    }

    // ─── No email when guest_email is missing ──────────────────────────

    public function test_no_email_sent_when_guest_email_is_empty(): void
    {
        Mail::fake();

        $slotStart = Carbon::now('UTC')->addDays(3)->setTime(14, 0);

        $this->engine->book(
            $this->type,
            'No Email Guest',
            '',
            $slotStart,
            'America/New_York'
        );

        Mail::assertNothingSent();
    }

    // ─── Guest data persistence ────────────────────────────────────────

    public function test_guest_information_persists_after_cancellation(): void
    {
        $booking = $this->createPendingNonRegisteredBooking();
        $this->engine->confirmBooking($booking);
        $this->engine->cancelBookingByHost($booking);

        $this->assertDatabaseHas('meeting_bookings', [
            'id' => $booking->id,
            'guest_name' => 'Jane Guest',
            'guest_email' => 'jane@example.com',
            'status' => MeetingBooking::STATUS_CANCELLED,
        ]);
    }

    public function test_guest_information_persists_after_decline(): void
    {
        $booking = $this->createPendingNonRegisteredBooking();
        $this->engine->confirmBooking($booking);
        $this->engine->declineBooking($booking);

        $this->assertDatabaseHas('meeting_bookings', [
            'id' => $booking->id,
            'guest_name' => 'Jane Guest',
            'guest_email' => 'jane@example.com',
            'status' => MeetingBooking::STATUS_DECLINED,
        ]);
    }

    public function test_returning_guest_creates_separate_booking_records(): void
    {
        $slotStart1 = Carbon::now('UTC')->addDays(3)->setTime(14, 0);
        $slotStart2 = Carbon::now('UTC')->addDays(7)->setTime(14, 0);

        $booking1 = $this->engine->book(
            $this->type,
            'Jane Guest',
            'jane@example.com',
            $slotStart1,
            'America/New_York'
        );

        $booking2 = $this->engine->book(
            $this->type,
            'Jane Guest',
            'jane@example.com',
            $slotStart2,
            'America/New_York'
        );

        $this->assertNotEquals($booking1->id, $booking2->id);
        $this->assertDatabaseHas('meeting_bookings', [
            'id' => $booking1->id,
            'guest_name' => 'Jane Guest',
        ]);
        $this->assertDatabaseHas('meeting_bookings', [
            'id' => $booking2->id,
            'guest_name' => 'Jane Guest',
        ]);
    }

    // ─── Email template rendering ──────────────────────────────────────

    public function test_guest_booking_received_template_renders(): void
    {
        $booking = $this->createPendingNonRegisteredBooking();

        $view = view('emails.notifications.guest-booking-received', [
            'booking' => $booking,
            'guestName' => $booking->guest_name,
        ])->render();

        $this->assertStringContainsString('Jane Guest', $view);
        $this->assertStringContainsString('30-min Call', $view);
    }

    public function test_guest_meeting_confirmed_template_renders(): void
    {
        $booking = $this->createPendingNonRegisteredBooking();

        $view = view('emails.notifications.guest-meeting-confirmed', [
            'booking' => $booking,
            'guestName' => $booking->guest_name,
        ])->render();

        $this->assertStringContainsString('Jane Guest', $view);
        $this->assertStringContainsString('confirmed', $view);
    }

    public function test_guest_meeting_cancelled_template_renders_with_reason(): void
    {
        $booking = $this->createPendingNonRegisteredBooking();

        $view = view('emails.notifications.guest-meeting-cancelled', [
            'booking' => $booking,
            'guestName' => $booking->guest_name,
            'reason' => 'Schedule conflict',
        ])->render();

        $this->assertStringContainsString('Jane Guest', $view);
        $this->assertStringContainsString('Schedule conflict', $view);
    }

    // ─── Helpers ────────────────────────────────────────────────────────

    protected function createPendingNonRegisteredBooking(): MeetingBooking
    {
        $slotStart = Carbon::now('UTC')->addDays(3)->setTime(14, 0);

        return $this->engine->book(
            $this->type,
            'Jane Guest',
            'jane@example.com',
            $slotStart,
            'America/New_York'
        );
    }

    protected function getFutureWeekday(int $daysAhead): Carbon
    {
        $date = Carbon::now('UTC')->addDays($daysAhead);
        while ($date->isWeekend()) {
            $date->addDay();
        }
        return $date;
    }
}
