<?php

namespace App\Jobs;

use App\Mail\AdminMessageMail;
use App\Models\AdminMessageRecipient;
use App\Services\Admin\AdminMessageRenderer;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\Middleware\RateLimited;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Throwable;

/**
 * Sends exactly one email to exactly one recipient.
 */
class SendAdminMessageRecipientJob implements ShouldQueue, ShouldBeUnique
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 60;

    /** @var array<int, int> */
    public array $backoff = [10, 60, 300];

    /** Prevent duplicate jobs for the same recipient while one is pending. */
    public int $uniqueFor = 3600;

    public function __construct(public int $recipientId) {}

    public function uniqueId(): string
    {
        return 'admin-message-recipient:' . $this->recipientId;
    }

    /**
     * @return array<int, object>
     */
    public function middleware(): array
    {
        // Stay below Resend's 10 requests/second per-team limit.
        return [new RateLimited('admin-mail')];
    }

    public function handle(AdminMessageRenderer $renderer): void
    {
        $recipient = AdminMessageRecipient::with(['message', 'user'])->find($this->recipientId);

        if (! $recipient || ! $recipient->message) {
            return;
        }

        if ($recipient->status === AdminMessageRecipient::STATUS_SENT) {
            return;
        }

        // Atomic claim: only one worker may move a queued row to sending.
        $claimed = AdminMessageRecipient::query()
            ->whereKey($recipient->id)
            ->where(function ($query) {
                $query->where('status', AdminMessageRecipient::STATUS_QUEUED)
                    ->orWhere(function ($stale) {
                        $stale->where('status', AdminMessageRecipient::STATUS_SENDING)
                            ->where('updated_at', '<', now()->subMinutes(5));
                    });
            })
            ->update([
                'status' => AdminMessageRecipient::STATUS_SENDING,
                'attempts' => $recipient->attempts + 1,
            ]);

        if ($claimed === 0) {
            return;
        }

        $message = $recipient->message;
        $user = $recipient->user;

        $subject = $renderer->subject($message->subject, $user, $recipient->email);
        $rendered = $renderer->render($message->body, $user, $recipient->email);

        try {
            Mail::to($recipient->email)->send(new AdminMessageMail(
                subjectLine: $subject,
                bodyText: $rendered['text'],
                bodyHtml: $rendered['html'],
                recipientName: $recipient->name,
                adminMessageId: $message->id,
                recipientUserId: $recipient->user_id,
            ));

            $recipient->forceFill([
                'status' => AdminMessageRecipient::STATUS_SENT,
                'error' => null,
                'sent_at' => now(),
            ])->save();
        } catch (Throwable $e) {
            // Retrying a provider quota error on the same UTC day cannot
            // succeed and would burn more API calls, so fail fast.
            $quotaExceeded = str_contains(strtolower($e->getMessage()), 'daily_quota_exceeded')
                || str_contains(strtolower($e->getMessage()), 'monthly_quota_exceeded')
                || str_contains(strtolower($e->getMessage()), 'quota exceeded');

            $isFinalAttempt = $this->attempts() >= $this->tries || $quotaExceeded;

            $recipient->forceFill([
                // A non-final failure goes back to queued for the queue's
                // automatic retry; only the last attempt is terminal.
                'status' => $isFinalAttempt
                    ? AdminMessageRecipient::STATUS_FAILED
                    : AdminMessageRecipient::STATUS_QUEUED,
                'error' => Str::limit($e->getMessage(), 900),
            ])->save();

            $message->refreshCounts();

            if ($isFinalAttempt) {
                Log::error('Admin message recipient failed', [
                    'admin_message_id' => $message->id,
                    'recipient_id' => $recipient->id,
                    'error' => $e->getMessage(),
                ]);

                return;
            }

            throw $e;
        }

        $message->refreshCounts();
    }
}
