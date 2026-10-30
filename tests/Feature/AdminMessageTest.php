<?php

namespace Tests\Feature;

use App\Jobs\DispatchAdminMessageJob;
use App\Mail\AdminMessageMail;
use App\Models\AdminActionLog;
use App\Models\AdminMessage;
use App\Models\AdminMessageRecipient;
use App\Models\User;
use App\Services\Admin\AdminMessageGuard;
use App\Services\Admin\AdminMessageRenderer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class AdminMessageTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array{0: User, 1: string}
     */
    private function admin(): array
    {
        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);

        return [$admin, $admin->createToken('test')->plainTextToken];
    }

    public function test_non_admin_gets_403_for_message_endpoints(): void
    {
        $member = User::factory()->create();
        $token = $member->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/admin/messages/recipients')
            ->assertStatus(403);

        $this->withToken($token)
            ->postJson('/api/admin/messages', [
                'subject' => 'Hello',
                'body' => 'Body',
                'category' => 'service',
                'expected_recipient_count' => 1,
            ])
            ->assertStatus(403);
    }

    public function test_recipient_picker_excludes_admins_and_soft_deleted_and_supports_filters(): void
    {
        [, $token] = $this->admin();

        User::factory()->create(['role' => 'admin']);
        User::factory()->create()->delete();

        $alice = User::factory()->create([
            'first_name' => 'Alice',
            'last_name' => 'Zephyr',
            'email' => 'alice@example.test',
            'status' => 'active',
            'campaign_code' => 'NLF',
            'onboarding_completed_at' => now(),
            'email_verified_at' => now(),
        ]);

        $bob = User::factory()->create([
            'first_name' => 'Bob',
            'last_name' => 'Draft',
            'email' => 'bob@example.test',
            'status' => 'draft',
            'campaign_code' => null,
            'onboarding_completed_at' => null,
            'email_verified_at' => null,
        ]);

        $all = $this->withToken($token)->getJson('/api/admin/messages/recipients');
        $all->assertStatus(200)->assertJsonPath('count', 2);
        $ids = collect($all->json('data'))->pluck('id')->all();
        $this->assertContains($alice->id, $ids);
        $this->assertContains($bob->id, $ids);

        $filtered = $this->withToken($token)->getJson(
            '/api/admin/messages/recipients?search=Zephyr&status=active&onboarding_completed=1&has_campaign_code=1&email_verified=1'
        );

        $filtered->assertStatus(200)->assertJsonPath('count', 1);
        $this->assertSame($alice->id, $filtered->json('data.0.id'));
        $this->assertTrue($filtered->json('data.0.onboarding_completed'));
        $this->assertSame('NLF', $filtered->json('data.0.campaign_code'));

        $draft = $this->withToken($token)->getJson('/api/admin/messages/recipients?status=draft');
        $draft->assertJsonPath('count', 1);
        $this->assertSame($bob->id, $draft->json('data.0.id'));
        $this->assertNotNull($draft->json('data.0.draft_closes_at'));
        $this->assertNotNull($draft->json('data.0.draft_days_remaining'));
    }

    public function test_created_date_range_filter_and_admin_opt_in(): void
    {
        [$admin, $token] = $this->admin();

        User::factory()->create(['created_at' => now()->subDays(40)]);
        User::factory()->create(['created_at' => now()->subDay()]);

        $recent = $this->withToken($token)->getJson(
            '/api/admin/messages/recipients?created_from=' . now()->subDays(5)->toDateString()
        );
        $recent->assertJsonPath('count', 1);

        $withAdmins = $this->withToken($token)->getJson('/api/admin/messages/recipients?include_admins=1');
        $ids = collect($withAdmins->json('data'))->pluck('id');
        $this->assertTrue($ids->contains($admin->id));
    }

    public function test_unknown_placeholders_are_rejected(): void
    {
        [, $token] = $this->admin();

        $this->withToken($token)
            ->postJson('/api/admin/messages/preview', [
                'subject' => 'Hello {first_name}',
                'body' => 'Your plan is {plan_name}.',
                'category' => 'service',
            ])
            ->assertStatus(422)
            ->assertJsonPath('message', fn ($value) => str_contains($value, 'plan_name'));
    }

    public function test_draft_nudge_cannot_claim_the_profile_is_live(): void
    {
        $guard = app(AdminMessageGuard::class);

        $this->assertNotEmpty($guard->validate(
            AdminMessage::CATEGORY_NUDGE,
            'Your profile is live',
            'Your profile is now live and shareable.',
        ));

        $this->assertNotEmpty($guard->validate(
            AdminMessage::CATEGORY_NUDGE,
            'Activate your Roicard',
            'Activate today.',
        ));

        $this->assertSame([], $guard->validate(
            AdminMessage::CATEGORY_NUDGE,
            'Your Roicard draft is still saved',
            'Hi {first_name}, your profile is saved privately as a draft. Activate your membership to make it live.',
        ));

        // Service notices are exempt from the draft wording rule.
        $this->assertSame([], $guard->validate(
            AdminMessage::CATEGORY_SERVICE,
            'Service restored',
            'Roicard is back online.',
        ));
    }

    public function test_composer_html_is_escaped_and_links_are_auto_linked(): void
    {
        $renderer = app(AdminMessageRenderer::class);
        $user = User::factory()->make(['first_name' => 'Ama', 'email' => 'ama@example.test']);

        $rendered = $renderer->render(
            "Hi {first_name},\n\n<script>alert('x')</script> see https://example.test/help.",
            $user,
            $user->email,
        );

        $this->assertStringContainsString('Hi Ama,', $rendered['text']);
        $this->assertStringNotContainsString('<script>', $rendered['html']);
        $this->assertStringContainsString('&lt;script&gt;', $rendered['html']);
        $this->assertStringContainsString('<a href="https://example.test/help"', $rendered['html']);
        $this->assertStringContainsString('<p>', $rendered['html']);
    }

    public function test_preview_substitutes_placeholders_and_renders_branded_layout(): void
    {
        [$admin, $token] = $this->admin();

        $response = $this->withToken($token)->postJson('/api/admin/messages/preview', [
            'subject' => 'Hello {first_name}',
            'body' => "Hi {first_name},\n\nThis is {full_name}.",
            'category' => 'service',
            'user_id' => $admin->id,
        ]);

        $response->assertStatus(200);
        $this->assertStringContainsString('Hi ' . $admin->first_name, $response->json('text'));
        $this->assertStringContainsString('Hello ' . $admin->first_name, $response->json('subject'));
        $this->assertStringContainsString(config('mail.admin.support_email'), $response->json('html'));
    }

    public function test_test_send_goes_only_to_the_admin_without_reply_to(): void
    {
        Mail::fake();
        [$admin, $token] = $this->admin();

        $this->withToken($token)->postJson('/api/admin/messages/test', [
            'subject' => 'Test {first_name}',
            'body' => 'Hello {first_name}',
            'category' => 'service',
        ])->assertStatus(200)->assertJsonPath('email', $admin->email);

        Mail::assertSent(AdminMessageMail::class, function (AdminMessageMail $mail) use ($admin) {
            return $mail->hasTo($admin->email)
                && $mail->envelope()->subject === 'Test ' . $admin->first_name
                && $mail->envelope()->from->address === config('mail.admin.from_address')
                && $mail->envelope()->replyTo === [];
        });

        $this->assertDatabaseHas('admin_action_logs', ['action' => 'send_admin_message_test']);
    }

    public function test_store_creates_one_recipient_per_member_and_dispatches_queue_job(): void
    {
        Queue::fake();
        [$admin, $token] = $this->admin();

        $members = User::factory()->count(3)->create(['status' => 'active']);
        User::factory()->create(['role' => 'admin']);

        $response = $this->withToken($token)->postJson('/api/admin/messages', [
            'subject' => 'Scheduled maintenance',
            'body' => 'Hi {first_name}, we will be offline tonight.',
            'category' => 'service',
            'expected_recipient_count' => 3,
        ], ['Idempotency-Key' => 'store-test-1']);

        $response->assertStatus(201);

        $message = AdminMessage::firstOrFail();
        $this->assertSame(3, $message->recipient_count);
        $this->assertSame(3, $message->recipients()->count());
        $this->assertSame(3, $message->queued_count);

        $recipientEmails = $message->recipients()->pluck('email')->all();
        foreach ($members as $member) {
            $this->assertContains($member->email, $recipientEmails);
        }

        Queue::assertPushed(DispatchAdminMessageJob::class, fn ($job) => $job->adminMessageId === $message->id);

        $this->assertDatabaseHas('admin_action_logs', [
            'action' => 'send_admin_message',
            'admin_id' => $admin->id,
        ]);
    }

    public function test_send_is_idempotent_on_double_click(): void
    {
        Queue::fake();
        [, $token] = $this->admin();
        User::factory()->create(['status' => 'active']);

        $payload = [
            'subject' => 'Outage notice',
            'body' => 'Hi {first_name}, service is disrupted.',
            'category' => 'service',
            'expected_recipient_count' => 1,
        ];

        $this->withToken($token)
            ->postJson('/api/admin/messages', $payload, ['Idempotency-Key' => 'double-click-1'])
            ->assertStatus(201);

        $second = $this->withToken($token)
            ->postJson('/api/admin/messages', $payload, ['Idempotency-Key' => 'double-click-1']);

        $second->assertStatus(201);
        $second->assertHeader('X-Idempotent-Replayed', 'true');
        $this->assertSame(1, AdminMessage::count());
        Queue::assertPushed(DispatchAdminMessageJob::class, 1);
    }

    public function test_store_requires_an_accurate_expected_count(): void
    {
        Queue::fake();
        [, $token] = $this->admin();
        User::factory()->count(2)->create();

        $this->withToken($token)->postJson('/api/admin/messages', [
            'subject' => 'Count check',
            'body' => 'Body',
            'category' => 'service',
            'expected_recipient_count' => 5,
        ], ['Idempotency-Key' => 'count-check-1'])
            ->assertStatus(422)
            ->assertJsonPath('message', fn ($value) => str_contains($value, '2 recipients'));
    }

    public function test_large_sends_require_typing_the_recipient_count(): void
    {
        Queue::fake();
        [, $token] = $this->admin();
        User::factory()->count(51)->create();

        $this->withToken($token)->postJson('/api/admin/messages', [
            'subject' => 'Large send',
            'body' => 'Body',
            'category' => 'service',
            'expected_recipient_count' => 51,
        ], ['Idempotency-Key' => 'large-1'])
            ->assertStatus(422)
            ->assertJsonPath('message', fn ($value) => str_contains($value, 'Type 51'));

        $this->withToken($token)->postJson('/api/admin/messages', [
            'subject' => 'Large send',
            'body' => 'Body',
            'category' => 'service',
            'expected_recipient_count' => 51,
            'confirmation_text' => '51',
        ], ['Idempotency-Key' => 'large-2'])
            ->assertStatus(201);
    }

    public function test_recent_duplicate_subject_requires_acknowledgement_and_skips_duplicates(): void
    {
        Queue::fake();
        [, $token] = $this->admin();

        $alreadyMessaged = User::factory()->create(['status' => 'active']);
        $newMember = User::factory()->create(['status' => 'active']);

        $previous = AdminMessage::create([
            'sent_by' => null,
            'subject' => 'Service restored',
            'body' => 'Back online.',
            'category' => 'service',
            'recipient_count' => 1,
            'status' => AdminMessage::STATUS_SENT,
        ]);

        AdminMessageRecipient::create([
            'admin_message_id' => $previous->id,
            'user_id' => $alreadyMessaged->id,
            'email' => $alreadyMessaged->email,
            'name' => $alreadyMessaged->first_name,
            'status' => AdminMessageRecipient::STATUS_SENT,
            'sent_at' => now(),
        ]);

        $payload = [
            'subject' => 'Service restored',
            'body' => 'Back online.',
            'category' => 'service',
            'expected_recipient_count' => 2,
        ];

        $this->withToken($token)->postJson('/api/admin/messages', $payload, ['Idempotency-Key' => 'dup-1'])
            ->assertStatus(422)
            ->assertJsonPath('duplicate_count', 1);

        $this->withToken($token)->postJson('/api/admin/messages', $payload + ['acknowledge_duplicates' => true], ['Idempotency-Key' => 'dup-2'])
            ->assertStatus(201);

        $message = AdminMessage::latest('id')->firstOrFail();
        $this->assertSame(1, $message->recipient_count);
        $this->assertSame(1, $message->skipped_count);
        $this->assertTrue($message->recipients()->where('user_id', $newMember->id)->exists());
        $this->assertFalse($message->recipients()->where('user_id', $alreadyMessaged->id)->exists());
    }

    public function test_daily_quota_blocks_a_send_that_would_exceed_the_free_plan(): void
    {
        Queue::fake();
        [, $token] = $this->admin();
        config(['mail.admin.daily_quota' => 2, 'mail.admin.monthly_quota' => 1000]);

        User::factory()->count(3)->create();

        $this->withToken($token)->postJson('/api/admin/messages', [
            'subject' => 'Over budget',
            'body' => 'Body',
            'category' => 'service',
            'expected_recipient_count' => 3,
        ], ['Idempotency-Key' => 'quota-1'])
            ->assertStatus(422)
            ->assertJsonPath('message', fn ($value) => str_contains($value, 'budget'));
    }

    public function test_retry_only_requeues_failed_recipients(): void
    {
        Queue::fake();
        [, $token] = $this->admin();

        $message = AdminMessage::create([
            'sent_by' => null,
            'subject' => 'Retry me',
            'body' => 'Body',
            'category' => 'service',
            'recipient_count' => 2,
            'status' => AdminMessage::STATUS_PARTIAL,
            'sent_count' => 1,
            'failed_count' => 1,
        ]);

        $sent = AdminMessageRecipient::create([
            'admin_message_id' => $message->id,
            'user_id' => User::factory()->create()->id,
            'email' => 'sent@example.test',
            'status' => AdminMessageRecipient::STATUS_SENT,
            'sent_at' => now(),
        ]);

        $failed = AdminMessageRecipient::create([
            'admin_message_id' => $message->id,
            'user_id' => User::factory()->create()->id,
            'email' => 'failed@example.test',
            'status' => AdminMessageRecipient::STATUS_FAILED,
            'error' => 'Invalid address',
        ]);

        $this->withToken($token)
            ->postJson("/api/admin/messages/{$message->id}/retry", [], ['Idempotency-Key' => 'retry-1'])
            ->assertStatus(200)
            ->assertJsonPath('queued_count', 1);

        $this->assertSame(AdminMessageRecipient::STATUS_SENT, $sent->fresh()->status);
        $this->assertSame(AdminMessageRecipient::STATUS_QUEUED, $failed->fresh()->status);
        $this->assertNull($failed->fresh()->error);

        Queue::assertPushed(DispatchAdminMessageJob::class, fn ($job) => $job->adminMessageId === $message->id);
    }

    public function test_sent_messages_list_and_detail_expose_progress(): void
    {
        [, $token] = $this->admin();

        $message = AdminMessage::create([
            'sent_by' => null,
            'subject' => 'Progress',
            'body' => 'Body',
            'category' => 'service',
            'recipient_count' => 2,
            'status' => AdminMessage::STATUS_SENT,
            'sent_count' => 2,
        ]);

        foreach (['a@example.test', 'b@example.test'] as $email) {
            AdminMessageRecipient::create([
                'admin_message_id' => $message->id,
                'user_id' => User::factory()->create()->id,
                'email' => $email,
                'status' => AdminMessageRecipient::STATUS_SENT,
                'sent_at' => now(),
            ]);
        }

        $list = $this->withToken($token)->getJson('/api/admin/messages');
        $list->assertStatus(200)->assertJsonPath('total', 1);
        $list->assertJsonPath('data.0.sent_recipients_count', 2);

        $detail = $this->withToken($token)->getJson("/api/admin/messages/{$message->id}");
        $detail->assertStatus(200)
            ->assertJsonPath('message.subject', 'Progress')
            ->assertJsonPath('message.sent_count', 2)
            ->assertJsonPath('total', 2);

        $this->assertDatabaseHas('admin_message_recipients', ['admin_message_id' => $message->id]);
    }

    public function test_mailable_renders_html_and_text_after_a_markdown_text_render(): void
    {
        // Simulate a Markdown mail leaving the "mail" namespace on the text
        // components before our plain-view mailable renders.
        app(\Illuminate\Mail\Markdown::class)->renderText('emails.draft-reminder', [
            'user' => User::factory()->create(),
        ]);

        $mail = new AdminMessageMail(
            subjectLine: 'Subject',
            bodyText: 'Hi Jane',
            bodyHtml: '<p>Hi Jane</p>',
            recipientName: 'Jane',
            adminMessageId: 1,
            recipientUserId: 2,
        );

        $html = $mail->render();
        $this->assertStringContainsString('<p>Hi Jane</p>', $html);
        $this->assertStringContainsString(config('mail.admin.support_email'), $html);

        $text = view('emails.admin-message-text', [
            'bodyText' => 'Hi Jane',
            'supportEmail' => config('mail.admin.support_email'),
        ])->render();
        $this->assertStringContainsString('Hi Jane', $text);
    }

    public function test_each_recipient_is_greeted_with_their_own_full_name(): void
    {
        Mail::fake();
        [, $token] = $this->admin();

        $ebenezer = User::factory()->create([
            'first_name' => 'Ebenezer',
            'last_name' => 'Akparibo',
            'email' => 'ebenezer@example.test',
            'status' => 'active',
        ]);

        $ama = User::factory()->create([
            'first_name' => 'Ama',
            'last_name' => 'Mensah',
            'email' => 'ama@example.test',
            'status' => 'active',
        ]);

        $this->withToken($token)->postJson('/api/admin/messages', [
            'subject' => 'A reminder for {full_name}',
            'body' => "Hi {full_name},\n\nThis is a reminder about your Roicard membership.",
            'category' => 'service',
            'expected_recipient_count' => 2,
        ], ['Idempotency-Key' => 'personalize-1'])->assertStatus(201);

        Mail::assertSent(AdminMessageMail::class, function (AdminMessageMail $mail) use ($ebenezer) {
            if (! $mail->hasTo($ebenezer->email)) {
                return false;
            }

            $html = $mail->render();

            return str_contains($html, 'Hi Ebenezer Akparibo,')
                && $mail->envelope()->subject === 'A reminder for Ebenezer Akparibo'
                && ! str_contains($html, 'Ama Mensah');
        });

        Mail::assertSent(AdminMessageMail::class, function (AdminMessageMail $mail) use ($ama) {
            if (! $mail->hasTo($ama->email)) {
                return false;
            }

            $html = $mail->render();

            return str_contains($html, 'Hi Ama Mensah,')
                && $mail->envelope()->subject === 'A reminder for Ama Mensah'
                && ! str_contains($html, 'Ebenezer Akparibo');
        });
    }

    public function test_personalization_falls_back_to_the_name_captured_at_send_time(): void
    {
        Mail::fake();

        $message = AdminMessage::create([
            'sent_by' => null,
            'subject' => 'Still saved as a draft',
            'body' => "Hi {full_name},\n\nYour profile is saved privately as a draft.",
            'category' => 'nudge',
            'recipient_count' => 1,
            'queued_count' => 1,
            'status' => AdminMessage::STATUS_QUEUED,
        ]);

        // The account was soft-deleted after the message was queued, so the
        // relation no longer resolves; the stored name must still be used.
        $recipient = AdminMessageRecipient::create([
            'admin_message_id' => $message->id,
            'user_id' => null,
            'email' => 'gone@example.test',
            'name' => 'Ebenezer Akparibo',
            'status' => AdminMessageRecipient::STATUS_QUEUED,
        ]);

        (new \App\Jobs\SendAdminMessageRecipientJob($recipient->id))
            ->handle(app(AdminMessageRenderer::class));

        Mail::assertSent(AdminMessageMail::class, function (AdminMessageMail $mail) {
            return $mail->hasTo('gone@example.test')
                && str_contains($mail->render(), 'Hi Ebenezer Akparibo,');
        });

        $this->assertSame(
            AdminMessageRecipient::STATUS_SENT,
            $recipient->fresh()->status,
        );
    }

    public function test_recipient_without_any_name_still_gets_a_natural_greeting(): void
    {
        $renderer = app(AdminMessageRenderer::class);

        $this->assertSame(
            'Hi there,',
            $renderer->render('Hi {full_name},', null, 'nameless@example.test')['text'],
        );
    }

    public function test_each_recipient_gets_an_individually_addressed_email(): void
    {
        Mail::fake();
        [, $token] = $this->admin();

        $first = User::factory()->create(['status' => 'active']);
        $second = User::factory()->create(['status' => 'active']);

        $this->withToken($token)->postJson('/api/admin/messages', [
            'subject' => 'Individual delivery',
            'body' => 'Hi {first_name}, this is for you only.',
            'category' => 'service',
            'expected_recipient_count' => 2,
        ], ['Idempotency-Key' => 'individual-1'])->assertStatus(201);

        Mail::assertSent(AdminMessageMail::class, 2);

        foreach ([$first, $second] as $member) {
            Mail::assertSent(AdminMessageMail::class, function (AdminMessageMail $mail) use ($member) {
                return $mail->hasTo($member->email)
                    && count($mail->to) === 1
                    && $mail->cc === []
                    && $mail->bcc === [];
            });
        }

        $message = AdminMessage::latest('id')->firstOrFail();
        $this->assertSame(AdminMessage::STATUS_SENT, $message->status);
        $this->assertSame(2, $message->sent_count);
    }

    public function test_message_metadata_is_recorded_on_the_audit_log(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $log = AdminActionLog::create([
            'admin_id' => $admin->id,
            'action' => 'send_admin_message',
            'metadata' => ['admin_message_id' => 10, 'recipient_count' => 4],
        ]);

        $this->assertSame(4, $log->fresh()->metadata['recipient_count']);
        $this->assertTrue(DB::getSchemaBuilder()->hasColumn('admin_action_logs', 'metadata'));
    }
}
