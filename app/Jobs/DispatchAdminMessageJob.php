<?php

namespace App\Jobs;

use App\Models\AdminMessage;
use App\Models\AdminMessageRecipient;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Fans a message out into one job per recipient.
 *
 * Kept off the request so a large audience never blocks the admin's HTTP
 * request. Recipient jobs are queued on the default queue because the deployed
 * roicard-worker processes only that queue.
 */
class DispatchAdminMessageJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 300;

    public function __construct(public int $adminMessageId) {}

    public function handle(): void
    {
        $message = AdminMessage::find($this->adminMessageId);

        if (! $message) {
            return;
        }

        if (in_array($message->status, [
            AdminMessage::STATUS_SENT,
            AdminMessage::STATUS_PARTIAL,
            AdminMessage::STATUS_FAILED,
        ], true)) {
            return;
        }

        // Recover rows left in "sending" by a worker that died mid-send.
        AdminMessageRecipient::query()
            ->where('admin_message_id', $message->id)
            ->where('status', AdminMessageRecipient::STATUS_SENDING)
            ->where('updated_at', '<', now()->subMinutes(10))
            ->update(['status' => AdminMessageRecipient::STATUS_QUEUED]);

        $message->forceFill([
            'started_at' => $message->started_at ?? now(),
            'status' => AdminMessage::STATUS_SENDING,
        ])->save();

        AdminMessageRecipient::query()
            ->where('admin_message_id', $message->id)
            ->where('status', AdminMessageRecipient::STATUS_QUEUED)
            ->orderBy('id')
            ->chunkById(100, function ($recipients): void {
                foreach ($recipients as $recipient) {
                    SendAdminMessageRecipientJob::dispatch($recipient->id);
                }
            });

        $message->refreshCounts();
    }
}
