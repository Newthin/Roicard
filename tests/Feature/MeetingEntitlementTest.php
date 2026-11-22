<?php

namespace Tests\Feature;

use App\Models\MeetingBlockedDate;
use App\Models\MeetingBooking;
use App\Models\MeetingType;
use App\Models\MeetingTypeAvailability;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Meeting management is a paid entitlement. Free members must not be able to
 * create or manage meeting types, availability or booking decisions, but a
 * member who was downgraded after a booking was made can still view and cancel
 * that booking. Guests booking a paid host remain unaffected.
 */
class MeetingEntitlementTest extends TestCase
{
    use RefreshDatabase;

    protected function memberWithPlan(string $planCode): User
    {
        $plan = Plan::where('code', $planCode)->firstOrFail();

        $user = User::factory()->create([
            'status' => 'active',
            'onboarding_completed_at' => now(),
            'timezone' => 'UTC',
        ]);

        // An explicit subscription row keeps this a genuine free plan: without
        // one, "active" members fall back to the legacy founding entitlement.
        Subscription::create([
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'status' => Subscription::STATUS_ACTIVE,
            'started_at' => now(),
            'current_period_start' => now(),
            'current_period_end' => now()->addYear(),
        ]);

        $user->profile()->create([
            'slug' => 'member-'.$user->id,
            'is_live' => true,
        ]);

        return $user->fresh();
    }

    protected function meetingTypeFor(User $user): MeetingType
    {
        return MeetingType::create([
            'user_id' => $user->id,
            'name' => 'Intro call',
            'duration_minutes' => 30,
            'format' => MeetingType::FORMAT_GOOGLE_MEET,
            'capacity' => 1,
            'is_active' => true,
            'min_notice_hours' => 2,
            'advance_booking_days' => 30,
        ]);
    }

    public function test_free_member_cannot_create_or_manage_meeting_types(): void
    {
        $user = $this->memberWithPlan(Plan::FREE);
        $type = $this->meetingTypeFor($user);
        $this->actingAs($user);

        $this->getJson('/api/meeting-types')->assertStatus(403);
        $this->postJson('/api/meeting-types', [
            'name' => 'Paid only',
            'duration_minutes' => 30,
            'format' => MeetingType::FORMAT_GOOGLE_MEET,
        ])->assertStatus(403);
        $this->getJson("/api/meeting-types/{$type->id}")->assertStatus(403);
        $this->patchJson("/api/meeting-types/{$type->id}", ['name' => 'Nope'])->assertStatus(403);
        $this->deleteJson("/api/meeting-types/{$type->id}")->assertStatus(403);
        $this->getJson("/api/meeting-types/{$type->id}/slots")->assertStatus(403);

        $this->assertSame(
            'This feature is not available on your plan.',
            $this->getJson('/api/meeting-types')->json('message')
        );
    }

    public function test_free_member_cannot_manage_blocked_dates(): void
    {
        $user = $this->memberWithPlan(Plan::FREE);
        $blocked = MeetingBlockedDate::create([
            'user_id' => $user->id,
            'start_date' => now()->addDays(2)->toDateString(),
            'end_date' => now()->addDays(3)->toDateString(),
        ]);
        $this->actingAs($user);

        $this->getJson('/api/blocked-dates')->assertStatus(403);
        $this->postJson('/api/blocked-dates', [
            'start_date' => now()->addDays(5)->toDateString(),
        ])->assertStatus(403);
        $this->deleteJson("/api/blocked-dates/{$blocked->id}")->assertStatus(403);
    }

    public function test_free_member_cannot_decide_or_reschedule_bookings(): void
    {
        $user = $this->memberWithPlan(Plan::FREE);
        $type = $this->meetingTypeFor($user);
        $booking = MeetingBooking::create([
            'meeting_type_id' => $type->id,
            'host_user_id' => $user->id,
            'status' => MeetingBooking::STATUS_PENDING,
            'guest_name' => 'Guest',
            'guest_email' => 'guest@example.com',
            'guest_cancellation_token' => Str::random(64),
            'start_time' => now()->addDays(2),
            'end_time' => now()->addDays(2)->addMinutes(30),
            'timezone' => 'UTC',
            'type_name' => 'Intro call',
            'type_format' => MeetingType::FORMAT_GOOGLE_MEET,
            'type_duration_minutes' => 30,
        ]);
        $this->actingAs($user);

        $this->patchJson("/api/meetings/{$booking->id}/confirm")->assertStatus(403);
        $this->patchJson("/api/meetings/{$booking->id}/decline")->assertStatus(403);
        $this->postJson("/api/meetings/{$booking->id}/reschedule", [
            'proposed_start_time' => now()->addDays(3)->toIso8601String(),
        ])->assertStatus(403);
    }

    public function test_paid_member_can_manage_meetings(): void
    {
        $user = $this->memberWithPlan(Plan::ANNUAL);
        $type = $this->meetingTypeFor($user);
        $this->actingAs($user);

        $this->getJson('/api/meeting-types')->assertOk();
        $this->postJson('/api/meeting-types', [
            'name' => 'Another session',
            'duration_minutes' => 60,
            'format' => MeetingType::FORMAT_GOOGLE_MEET,
        ])->assertCreated();
        $this->getJson("/api/meeting-types/{$type->id}")->assertOk();
        $this->getJson('/api/blocked-dates')->assertOk();
        $this->getJson('/api/meetings')->assertOk();
    }

    public function test_dashboard_hides_meeting_type_counts_from_free_members(): void
    {
        $free = $this->memberWithPlan(Plan::FREE);
        $this->meetingTypeFor($free);
        $this->actingAs($free);

        $this->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('stats.meeting_types', 0);

        $paid = $this->memberWithPlan(Plan::ANNUAL);
        $this->meetingTypeFor($paid);
        $this->actingAs($paid);

        $this->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('stats.meeting_types', 1);
    }

    public function test_free_host_public_profile_exposes_no_bookable_meetings(): void
    {
        $host = $this->memberWithPlan(Plan::FREE);
        $type = $this->meetingTypeFor($host);
        // Even a stale row left behind by a downgrade must not be bookable.
        $slug = $host->profile->slug;

        $this->getJson("/api/public/{$slug}")
            ->assertOk()
            ->assertJsonCount(0, 'meeting_types');

        $this->getJson("/api/public/{$slug}/meeting-types")
            ->assertOk()
            ->assertJsonPath('meetings_available', false)
            ->assertJsonCount(0, 'data');

        $this->getJson("/api/public/{$slug}/meeting-types/{$type->id}/slots")
            ->assertStatus(403);

        $this->postJsonWithIdempotency("/api/public/{$slug}/meeting-types/{$type->id}/book", [
            'guest_name' => 'Guest',
            'guest_email' => 'guest@example.com',
            'start_time' => now()->addDays(3)->setTime(14, 0)->toIso8601String(),
            'timezone' => 'UTC',
        ])->assertStatus(403);
    }

    public function test_guest_can_still_book_a_paid_host(): void
    {
        $host = $this->memberWithPlan(Plan::ANNUAL);
        $type = $this->meetingTypeFor($host);

        foreach (range(1, 5) as $day) {
            MeetingTypeAvailability::create([
                'meeting_type_id' => $type->id,
                'day_of_week' => $day,
                'start_time' => '09:00',
                'end_time' => '17:00',
            ]);
        }

        $slug = $host->profile->slug;

        $this->getJson("/api/public/{$slug}/meeting-types")
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->postJsonWithIdempotency("/api/public/{$slug}/meeting-types/{$type->id}/book", [
            'guest_name' => 'Guest',
            'guest_email' => 'guest@example.com',
            'start_time' => Carbon::now('UTC')->addDays(3)->setTime(14, 0)->toIso8601String(),
            'timezone' => 'UTC',
        ])->assertCreated()
            ->assertJsonPath('data.status', 'pending');
    }

    public function test_downgraded_member_can_view_and_cancel_existing_bookings(): void
    {
        $host = $this->memberWithPlan(Plan::ANNUAL);
        $type = $this->meetingTypeFor($host);
        $booking = MeetingBooking::create([
            'meeting_type_id' => $type->id,
            'host_user_id' => $host->id,
            'status' => MeetingBooking::STATUS_CONFIRMED,
            'guest_name' => 'Guest',
            'guest_email' => 'guest@example.com',
            'guest_cancellation_token' => Str::random(64),
            'start_time' => now()->addDays(2),
            'end_time' => now()->addDays(2)->addMinutes(30),
            'timezone' => 'UTC',
            'type_name' => 'Intro call',
            'type_format' => MeetingType::FORMAT_GOOGLE_MEET,
            'type_duration_minutes' => 30,
        ]);

        $freePlan = Plan::where('code', Plan::FREE)->firstOrFail();
        $host->subscription->forceFill(['plan_id' => $freePlan->id])->save();
        $host->unsetRelation('subscription');

        $this->actingAs($host);

        $this->getJson('/api/meetings')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson("/api/meetings/{$booking->id}")->assertOk();
        $this->patchJson("/api/meetings/{$booking->id}/cancel")
            ->assertOk()
            ->assertJsonPath('data.status', MeetingBooking::STATUS_CANCELLED);

        $this->getJson('/api/meeting-types')->assertStatus(403);
        $this->postJson('/api/meeting-types', [
            'name' => 'Not allowed',
            'duration_minutes' => 30,
            'format' => MeetingType::FORMAT_GOOGLE_MEET,
        ])->assertStatus(403);
    }
}
