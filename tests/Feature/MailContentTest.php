<?php

namespace Tests\Feature;

use App\Mail\DraftClosureMail;
use App\Mail\DraftFinalNoticeMail;
use App\Mail\DraftReminderMail;
use App\Mail\DraftUrgentReminderMail;
use App\Mail\MembershipLapsedMail;
use App\Mail\RenewalReminderMail;
use App\Mail\WelcomeMemberMail;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\User;
use App\Services\MemberAccountService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Copy contract for membership and onboarding emails after the Phase 1
 * pricing change. Free profiles are public; paid benefits are subscription
 * driven; the draft sequence covers unfinished signups, not paid activation.
 */
class MailContentTest extends TestCase
{
    use RefreshDatabase;

    protected function member(array $attributes = []): User
    {
        return User::factory()->create([
            'status' => 'draft',
            'role' => 'member',
            ...$attributes,
        ]);
    }

    protected function subscriptionFor(User $user, string $planCode): Subscription
    {
        $plan = Plan::where('code', $planCode)->firstOrFail();

        return Subscription::create([
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'status' => Subscription::STATUS_ACTIVE,
            'started_at' => now(),
            'current_period_start' => now(),
            'current_period_end' => now()->addYear(),
        ]);
    }

    public function test_free_welcome_copy_describes_a_live_public_profile(): void
    {
        $user = $this->member();
        $user->profile()->create(['slug' => 'jane-doe']);

        $mail = new WelcomeMemberMail($user, 'free');

        $this->assertSame('Welcome to Roicard — your profile is live', $mail->envelope()->subject);

        $html = $mail->render();
        $this->assertStringContainsString('Your free profile is live and ready to share', $html);
        $this->assertStringContainsString('up to 3 education and experience entries', $html);
        $this->assertStringContainsString('View your profile', $html);
        $this->assertStringContainsString('/jane-doe', $html);
        $this->assertStringNotContainsString('saved privately as a draft', $html);
    }

    public function test_paid_welcome_copy_names_the_plan_and_unlocked_benefits(): void
    {
        $user = $this->member();
        $this->subscriptionFor($user, Plan::ANNUAL);

        $mail = new WelcomeMemberMail($user, 'paid', 'Annual Membership');

        $this->assertSame('Welcome to Roicard — your membership is active!', $mail->envelope()->subject);

        $html = $mail->render();
        $this->assertStringContainsString('Annual Membership', $html);
        $this->assertStringContainsString('meeting booking, full analytics, contact export', $html);
        $this->assertStringContainsString('Go to Dashboard', $html);
    }

    public function test_welcome_variant_follows_the_subscription_not_account_status(): void
    {
        Mail::fake();

        $free = $this->member();
        $free->profile()->create([]);
        app(MemberAccountService::class)->markOnboardingComplete($free, true, true);

        Mail::assertQueued(WelcomeMemberMail::class, fn ($mail) => $mail->variant === 'free');

        Mail::fake();

        $paid = $this->member();
        $paid->profile()->create([]);
        $this->subscriptionFor($paid, Plan::MONTHLY);
        app(MemberAccountService::class)->markOnboardingComplete($paid, true, true);

        Mail::assertQueued(WelcomeMemberMail::class, fn ($mail) => $mail->variant === 'paid');
    }

    public function test_renewal_copy_states_the_db_renewal_amount(): void
    {
        $user = $this->member();
        $subscription = $this->subscriptionFor($user, Plan::ANNUAL);

        $html = (new RenewalReminderMail($user, $subscription, 7))->render();

        $this->assertStringContainsString('The renewal amount is', $html);
        $this->assertStringContainsString('GHS 250.00', $html);
        $this->assertStringContainsString('MoMo link', $html);
        $this->assertStringContainsString('7-day grace period', $html);
    }

    public function test_lapsed_copy_points_to_plan_comparison_and_keeps_profile_language(): void
    {
        $user = $this->member();

        $html = (new MembershipLapsedMail($user))->render();

        $this->assertStringContainsString('nothing was deleted', $html);
        $this->assertStringContainsString('Compare plans', $html);
        $this->assertStringNotContainsString('Renew Membership', $html);
    }

    public function test_draft_sequence_copy_matches_unfinished_signup_flow(): void
    {
        $user = $this->member();

        $cases = [
            [new DraftReminderMail($user), 'Finish setting up your Roicard profile', 'Finish Setup'],
            [new DraftUrgentReminderMail($user), '1 day left to keep your Roicard link', 'Finish Setup'],
            [new DraftFinalNoticeMail($user), "Today's your last day to keep your Roicard link", 'Finish Setup'],
            [new DraftClosureMail($user->first_name), 'Your unfinished Roicard profile was closed', 'Start Again'],
        ];

        foreach ($cases as [$mail, $expectedSubject, $expectedCta]) {
            $this->assertSame($expectedSubject, $mail->envelope()->subject);
            $html = $mail->render();
            $this->assertStringContainsString($expectedSubject, $html);
            $this->assertStringContainsString($expectedCta, $html);
            $this->assertStringNotContainsString('Activate Membership', $html);
            $this->assertStringNotContainsString('reserved Smart Card', $html);
        }
    }
}
