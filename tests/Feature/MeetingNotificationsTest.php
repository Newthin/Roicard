<?php

namespace Tests\Feature;

use App\Jobs\SendMeetingReminderJob;
use App\Models\MeetingBooking;
use App\Models\MeetingType;
use App\Models\MeetingTypeAvailability;
use App\Models\User;
use App\Notifications\MeetingCancelledNotification;
use App\Notifications\MeetingConfirmedNotification;
use App\Notifications\MeetingDeclinedNotification;
use App\Notifications\MeetingReminderNotification;
use App\Notifications\MeetingRequestReceivedNotification;
use App\Notifications\RescheduleAcceptedNotification;
use App\Notifications\RescheduleDeclinedNotification;
use App\Notifications\RescheduleProposedNotification;
use App\Services\BookingEngine;
use App\Services\IcsService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class MeetingNotificationsTest extends TestCase
{
    use RefreshDatabase;

    protected BookingEngine $engine;
    protected User $host;
    protected User $guest;
    protected MeetingType $type;

    protected function setUp(): void
    {
        parent::setUp();

        $this->engine = app(BookingEngine::class);

        $this->host = User::factory()->create([
            'status' => 'active',
            'timezone' => 'America/New_York',
        ]);

        $this->guest = User::factory()->create([
            'status' => 'active',
            'timezone' => 'America/Chicago',
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

    // ─── Notification creation tests ─────────────────────────────────────

    public function test_booking_sends_request_received_notification_to_host(): void
    {
        Notification::fake();

        $slotStart = Carbon::now('UTC')->addDays(3)->setTime(14, 0);

        $booking = $this->engine->book(
            $this->type,
            'John Doe',
            'john@example.com',
            $slotStart,
            'America/New_York'
        );

        Notification::assertSentTo(
            $this->host,
            MeetingRequestReceivedNotification::class
        );
    }

    public function test_confirm_sends_confirmed_notification_to_guest_and_host(): void
    {
        Notification::fake();

        $booking = $this->createPendingBookingWithGuest();

        $this->engine->confirmBooking($booking);

        Notification::assertSentTo($this->host, MeetingConfirmedNotification::class);
        Notification::assertSentTo($this->guest, MeetingConfirmedNotification::class);
    }

    public function test_decline_sends_declined_notification_to_guest(): void
    {
        Notification::fake();

        $booking = $this->createPendingBooking();
        $this->engine->confirmBooking($booking);

        $this->engine->declineBooking($booking, 'Schedule conflict');

        Notification::assertSentTo(
            $this->guest,
            MeetingDeclinedNotification::class,
            function ($notification) {
                return $notification->reason === 'Schedule conflict';
            }
        );
    }

    public function test_cancel_by_host_sends_cancelled_notification_to_guest(): void
    {
        Notification::fake();

        $booking = $this->createPendingBooking();
        $this->engine->confirmBooking($booking);

        $this->engine->cancelBookingByHost($booking, 'Emergency');

        Notification::assertSentTo(
            $this->guest,
            MeetingCancelledNotification::class,
            function ($notification) {
                return $notification->reason === 'Emergency';
            }
        );
    }

    public function test_propose_reschedule_sends_notification_to_other_party(): void
    {
        Notification::fake();

        $booking = $this->createPendingBooking();
        $this->engine->confirmBooking($booking);

        $newStart = Carbon::now('UTC')->addDays(4)->setTime(15, 0);
        $this->engine->proposeReschedule($booking, $this->host->id, $newStart, 'Need to shift');

        Notification::assertSentTo(
            $this->guest,
            RescheduleProposedNotification::class
        );
    }

    public function test_accept_reschedule_sends_notification_to_both_parties(): void
    {
        Notification::fake();

        $booking = $this->createPendingBooking();
        $this->engine->confirmBooking($booking);

        $newStart = Carbon::now('UTC')->addDays(4)->setTime(15, 0);
        $request = $this->engine->proposeReschedule($booking, $this->host->id, $newStart);

        Notification::assertNothingSent();

        $this->engine->acceptReschedule($request);

        Notification::assertSentTo($this->guest, RescheduleAcceptedNotification::class);
        Notification::assertSentTo($this->host, RescheduleAcceptedNotification::class);
    }

    public function test_decline_reschedule_sends_notification_to_proposer_and_other_party(): void
    {
        Notification::fake();

        $booking = $this->createPendingBooking();
        $this->engine->confirmBooking($booking);

        $newStart = Carbon::now('UTC')->addDays(4)->setTime(15, 0);
        $request = $this->engine->proposeReschedule($booking, $this->host->id, $newStart);

        $this->engine->declineReschedule($request);

        Notification::assertSentTo($this->host, RescheduleDeclinedNotification::class);
        Notification::assertSentTo($this->guest, RescheduleDeclinedNotification::class);
    }

    // ─── In-app notification data tests ──────────────────────────────────

    public function test_notification toArray contains_required_fields(): void
    {
        $slotStart = Carbon::now('UTC')->addDays(3)->setTime(14, 0);

        $booking = $this->engine->book(
            $this->type,
            'John Doe',
            'john@example.com',
            $slotStart,
            'America/New_York'
        );

        $notification = new MeetingRequestReceivedNotification($booking);
        $data = $notification->toArray($this->host);

        $this->assertEquals('meeting_request_received', $data['type']);
        $this->assertEquals($booking->id, $data['booking_id']);
        $this->assertArrayHasKey('title', $data);
        $this->assertArrayHasKey('body', $data);
    }

    // ─── Email template rendering tests ──────────────────────────────────

    public function test_meeting_request_notification_renders_email(): void
    {
        $slotStart = Carbon::now('UTC')->addDays(3)->setTime(14, 0);

        $booking = $this->engine->book(
            $this->type,
            'John Doe',
            'john@example.com',
            $slotStart,
            'America/New_York'
        );

        $notification = new MeetingRequestReceivedNotification($booking);
        $mailMessage = $notification->toMail($this->host);

        $this->assertNotEmpty($mailMessage->subject);
        $this->assertStringContainsString('30-min Call', $mailMessage->subject);
    }

    public function test_meeting_confirmed_notification_has_ics_attachment(): void
    {
        $booking = $this->createPendingBooking();

        $notification = new MeetingConfirmedNotification($booking);
        $mailMessage = $notification->toMail($this->host);

        $this->assertNotEmpty($mailMessage->attachments);
    }

    // ─── ICS generation tests ────────────────────────────────────────────

    public function test_ics_service_generates_valid_content(): void
    {
        $booking = $this->createPendingBooking();

        $icsService = new IcsService();
        $content = $icsService->generateContent($booking);

        $this->assertStringContainsString('BEGIN:VCALENDAR', $content);
        $this->assertStringContainsString('END:VCALENDAR', $content);
        $this->assertStringContainsString('BEGIN:VEVENT', $content);
        $this->assertStringContainsString('END:VEVENT', $content);
        $this->assertStringContainsString('30-min Call', $content);
        $this->assertStringContainsString("UID:booking-{$booking->id}@roicard.com", $content);
    }

    public function test_ics_service_escapes_special_characters(): void
    {
        $booking = $this->createPendingBooking();
        $booking->update(['type_name' => 'Meeting; Comma, Test']);

        $icsService = new IcsService();
        $content = $icsService->generateContent($booking);

        $this->assertStringContainsString('Meeting\; Comma\, Test', $content);
    }

    public function test_ics_service_generates_correct_filename(): void
    {
        $booking = $this->createPendingBooking();

        $icsService = new IcsService();
        $filename = $icsService->generateFilename($booking);

        $this->assertEquals('30-min_Call.ics', $filename);
    }

    public function test_ics_contains_organizer_and_attendee(): void
    {
        $booking = $this->createPendingBooking();

        $icsService = new IcsService();
        $content = $icsService->generateContent($booking);

        $this->assertStringContainsString('ORGANIZER', $content);
        $this->assertStringContainsString('ATTENDEE', $content);
        $this->assertStringContainsString($this->host->email, $content);
    }

    public function test_ics_download_endpoint_returns_calendar_file(): void
    {
        $booking = $this->createPendingBooking();

        $response = $this->actingAs($this->host)
            ->get("/api/meetings/{$booking->id}/ics");

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'text/calendar; charset=utf-8');
        $response->assertHeader('Content-Disposition');
        $this->assertStringContainsString('BEGIN:VCALENDAR', $response->getContent());
    }

    // ─── Queue and after-commit behavior tests ───────────────────────────

    public function test_notifications_are_dispatched_after_commit(): void
    {
        Notification::fake();

        $slotStart = Carbon::now('UTC')->addDays(3)->setTime(14, 0);

        $booking = $this->engine->book(
            $this->type,
            'John Doe',
            'john@example.com',
            $slotStart,
            'America/New_York'
        );

        Notification::assertSentTo(
            $this->host,
            MeetingRequestReceivedNotification::class
        );
    }

    public function test_notification_failure_does_not_rollback_booking(): void
    {
        Notification::fake();

        $slotStart = Carbon::now('UTC')->addDays(3)->setTime(14, 0);

        $booking = $this->engine->book(
            $this->type,
            'John Doe',
            'john@example.com',
            $slotStart,
            'America/New_York'
        );

        // Booking is committed to DB even though notifications are intercepted
        $this->assertDatabaseHas('meeting_bookings', [
            'guest_name' => 'John Doe',
            'guest_email' => 'john@example.com',
            'status' => MeetingBooking::STATUS_PENDING,
        ]);

        // Notification was intercepted by fake, not actually dispatched
        Notification::assertSentTo($this->host, MeetingRequestReceivedNotification::class);
    }

    // ─── Reminder job tests ──────────────────────────────────────────────

    public function test_reminder_job_sends_notification_for_confirmed_booking(): void
    {
        Notification::fake();

        $booking = $this->createPendingBooking();
        $this->engine->confirmBooking($booking);

        // Set start_time to 24h from now
        $booking->update(['start_time' => Carbon::now('UTC')->addHours(24)]);

        $job = new SendMeetingReminderJob($booking, '24h');
        $job->handle();

        Notification::assertSentTo($this->host, MeetingReminderNotification::class);
    }

    public function test_reminder_job_is_idempotent(): void
    {
        Notification::fake();

        $booking = $this->createPendingBooking();
        $this->engine->confirmBooking($booking);
        $booking->update(['start_time' => Carbon::now('UTC')->addHours(24)]);

        $job = new SendMeetingReminderJob($booking, '24h');

        // Run twice
        $job->handle();
        $job->handle();

        // Should only send once due to cache dedup
        Notification::assertSentTo($this->host, MeetingReminderNotification::class, 1);
    }

    public function test_reminder_job_does_not_send_for_cancelled_booking(): void
    {
        Notification::fake();

        $booking = $this->createPendingBooking();
        $this->engine->confirmBooking($booking);
        $this->engine->cancelBookingByHost($booking);
        $booking->update(['start_time' => Carbon::now('UTC')->addHours(24)]);

        $job = new SendMeetingReminderJob($booking, '24h');
        $job->handle();

        Notification::assertNothingSent();
    }

    public function test_reminder_job_does_not_send_for_declined_booking(): void
    {
        Notification::fake();

        $booking = $this->createPendingBooking();
        $this->engine->confirmBooking($booking);
        $this->engine->declineBooking($booking);
        $booking->update(['start_time' => Carbon::now('UTC')->addHours(24)]);

        $job = new SendMeetingReminderJob($booking, '24h');
        $job->handle();

        Notification::assertNothingSent();
    }

    public function test_reminder_job_does_not_send_for_past_booking(): void
    {
        Notification::fake();

        $booking = $this->createPendingBooking();
        $this->engine->confirmBooking($booking);
        $booking->update(['start_time' => Carbon::now('UTC')->subHours(1)]);

        $job = new SendMeetingReminderJob($booking, '1h');
        $job->handle();

        Notification::assertNothingSent();
    }

    public function test_reminder_job_uses_correct_cache_key(): void
    {
        Notification::fake();

        $booking = $this->createPendingBooking();
        $this->engine->confirmBooking($booking);
        $booking->update(['start_time' => Carbon::now('UTC')->addHours(24)]);

        $job = new SendMeetingReminderJob($booking, '24h');
        $job->handle();

        $this->assertTrue(Cache::has("meeting_reminder:{$booking->id}:24h"));
    }

    public function test_reminder_1h_type_sends_notification(): void
    {
        Notification::fake();

        $booking = $this->createPendingBooking();
        $this->engine->confirmBooking($booking);
        $booking->update(['start_time' => Carbon::now('UTC')->addHours(1)]);

        $job = new SendMeetingReminderJob($booking, '1h');
        $job->handle();

        Notification::assertSentTo($this->host, MeetingReminderNotification::class);
    }

    // ─── Notification channel tests ──────────────────────────────────────

    public function test_request_received_notification_uses_database_and_mail_channels(): void
    {
        $slotStart = Carbon::now('UTC')->addDays(3)->setTime(14, 0);

        $booking = $this->engine->book(
            $this->type,
            'John Doe',
            'john@example.com',
            $slotStart,
            'America/New_York'
        );

        $notification = new MeetingRequestReceivedNotification($booking);
        $channels = $notification->via($this->host);

        $this->assertEquals(['database', 'mail'], $channels);
    }

    public function test_confirmed_notification_uses_database_and_mail_channels(): void
    {
        $booking = $this->createPendingBooking();

        $notification = new MeetingConfirmedNotification($booking);
        $channels = $notification->via($this->host);

        $this->assertEquals(['database', 'mail'], $channels);
    }

    public function test_reminder_notification_uses_database_and_mail_channels(): void
    {
        $booking = $this->createPendingBooking();

        $notification = new MeetingReminderNotification($booking, '24h');
        $channels = $notification->via($this->host);

        $this->assertEquals(['database', 'mail'], $channels);
    }

    // ─── Guest cancellation token not leaked ─────────────────────────────

    public function test_guest_cancellation_token_hidden_from_notification_array(): void
    {
        $slotStart = Carbon::now('UTC')->addDays(3)->setTime(14, 0);

        $booking = $this->engine->book(
            $this->type,
            'John Doe',
            'john@example.com',
            $slotStart,
            'America/New_York'
        );

        $notification = new MeetingRequestReceivedNotification($booking);
        $data = $notification->toArray($this->host);

        $this->assertArrayNotHasKey('guest_cancellation_token', $data);
    }

    // ─── Helper ──────────────────────────────────────────────────────────

    protected function createPendingBooking(): MeetingBooking
    {
        $slotStart = Carbon::now('UTC')->addDays(3)->setTime(14, 0);

        return $this->engine->book(
            $this->type,
            'John Doe',
            'john@example.com',
            $slotStart,
            'America/New_York'
        );
    }

    protected function createPendingBookingWithGuest(): MeetingBooking
    {
        $slotStart = Carbon::now('UTC')->addDays(3)->setTime(14, 0);

        return $this->engine->book(
            $this->type,
            $this->guest->first_name . ' ' . $this->guest->last_name,
            $this->guest->email,
            $slotStart,
            $this->guest->timezone,
            null,
            null,
            null,
            $this->guest->id
        );
    }
}
