<?php

namespace Tests\Feature;

use App\Mail\DraftClosureMail;
use App\Mail\DraftFinalNoticeMail;
use App\Mail\DraftReminderMail;
use App\Mail\DraftUrgentReminderMail;
use App\Models\SmartCard;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class DraftExpirationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(['name' => 'member', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        Cache::flush();
        Mail::fake();
    }

    private function draftUser(int $daysAgo, array $attributes = []): User
    {
        return User::factory()->create(array_merge([
            'status' => 'draft',
            'created_at' => now()->subDays($daysAgo),
        ], $attributes));
    }

    public function test_day_3_6_and_7_reminders_reach_only_the_matching_draft_cohort(): void
    {
        $day3 = $this->draftUser(3);
        $day6 = $this->draftUser(6);
        $day7 = $this->draftUser(7);
        // Should never be emailed/closed:
        $active = User::factory()->create([
            'status' => 'active',
            'created_at' => now()->subDays(6),
        ]);
        $admin = $this->draftUser(3, ['role' => 'admin']);
        $otherDay = $this->draftUser(4);

        $this->artisan('drafts:expiration-reminders')->assertSuccessful();

        Mail::assertQueued(DraftReminderMail::class, 1);
        Mail::assertQueued(DraftReminderMail::class, fn ($m) => $m->user->is($day3));

        Mail::assertQueued(DraftUrgentReminderMail::class, 1);
        Mail::assertQueued(DraftUrgentReminderMail::class, fn ($m) => $m->user->is($day6));

        Mail::assertQueued(DraftFinalNoticeMail::class, 1);
        Mail::assertQueued(DraftFinalNoticeMail::class, fn ($m) => $m->user->is($day7));

        Mail::assertNotQueued(DraftClosureMail::class);
        $this->assertNull($active->fresh()->deleted_at);
        $this->assertNull($otherDay->fresh()->deleted_at);
    }

    public function test_reminders_are_not_duplicated_on_a_same_day_rerun(): void
    {
        $this->draftUser(6);

        $this->artisan('drafts:expiration-reminders')->assertSuccessful();
        $this->artisan('drafts:expiration-reminders')->assertSuccessful();

        Mail::assertQueued(DraftUrgentReminderMail::class, 1);
    }

    public function test_day_8_closes_account_releases_card_and_sends_closure_mail(): void
    {
        $expired = $this->draftUser(8);
        $card = SmartCard::create([
            'card_id' => 'RC-TEST-00001',
            'user_id' => $expired->id,
            'inventory_status' => SmartCard::STATUS_ASSIGNED,
            'assigned_at' => now()->subDays(8),
            'delivery_name' => 'Someone',
        ]);

        $this->artisan('drafts:expiration-reminders')->assertSuccessful();

        $this->assertSoftDeleted($expired);

        $card->refresh();
        $this->assertNull($card->user_id);
        $this->assertSame(SmartCard::STATUS_AVAILABLE, $card->inventory_status);
        $this->assertNull($card->assigned_at);

        Mail::assertQueued(DraftClosureMail::class, 1);
        Mail::assertQueued(DraftClosureMail::class, fn ($m) => $m->firstName === $expired->first_name);
    }

    public function test_day_8_does_not_touch_active_members_or_admins(): void
    {
        $activeOld = User::factory()->create([
            'status' => 'active',
            'created_at' => now()->subDays(8),
        ]);
        $adminOld = $this->draftUser(8, ['role' => 'admin']);

        $this->artisan('drafts:expiration-reminders --day=8')->assertSuccessful();

        $this->assertNull($activeOld->fresh()->deleted_at);
        $this->assertNull($adminOld->fresh()->deleted_at);
        Mail::assertNotQueued(DraftClosureMail::class);
    }

    public function test_day_8_is_idempotent_across_reruns(): void
    {
        $this->draftUser(8);

        $this->artisan('drafts:expiration-reminders --day=8')->assertSuccessful();
        $this->artisan('drafts:expiration-reminders --day=8')->assertSuccessful();

        Mail::assertQueued(DraftClosureMail::class, 1);
    }
}
