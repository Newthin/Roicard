<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AdminMessage extends Model
{
    public const STATUS_QUEUED = 'queued';
    public const STATUS_SENDING = 'sending';
    public const STATUS_SENT = 'sent';
    public const STATUS_PARTIAL = 'partial';
    public const STATUS_FAILED = 'failed';

    public const CATEGORY_SERVICE = 'service';
    public const CATEGORY_NUDGE = 'nudge';

    protected $fillable = [
        'sent_by',
        'subject',
        'body',
        'category',
        'filter_snapshot',
        'recipient_count',
        'skipped_count',
        'queued_count',
        'sent_count',
        'failed_count',
        'status',
        'idempotency_key',
        'started_at',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'filter_snapshot' => 'array',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
            'recipient_count' => 'integer',
            'skipped_count' => 'integer',
            'queued_count' => 'integer',
            'sent_count' => 'integer',
            'failed_count' => 'integer',
        ];
    }

    public function sentBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sent_by');
    }

    public function recipients(): HasMany
    {
        return $this->hasMany(AdminMessageRecipient::class);
    }

    /**
     * Recompute the counters from the recipient rows. Counters are derived,
     * never incremented blindly, so a retried job cannot double-count.
     */
    public function refreshCounts(): self
    {
        $counts = $this->recipients()
            ->selectRaw("status, count(*) as aggregate")
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        $queued = (int) ($counts[AdminMessageRecipient::STATUS_QUEUED] ?? 0)
            + (int) ($counts[AdminMessageRecipient::STATUS_SENDING] ?? 0);
        $sent = (int) ($counts[AdminMessageRecipient::STATUS_SENT] ?? 0);
        $failed = (int) ($counts[AdminMessageRecipient::STATUS_FAILED] ?? 0);

        if ($queued > 0) {
            $status = $this->started_at ? self::STATUS_SENDING : self::STATUS_QUEUED;
            $completedAt = null;
        } elseif ($sent > 0 && $failed > 0) {
            $status = self::STATUS_PARTIAL;
            $completedAt = $this->completed_at ?? now();
        } elseif ($failed > 0) {
            $status = self::STATUS_FAILED;
            $completedAt = $this->completed_at ?? now();
        } else {
            $status = self::STATUS_SENT;
            $completedAt = $this->completed_at ?? now();
        }

        $this->forceFill([
            'queued_count' => $queued,
            'sent_count' => $sent,
            'failed_count' => $failed,
            'status' => $status,
            'completed_at' => $completedAt,
        ])->save();

        return $this;
    }

    public function isStuck(int $minutes = 10): bool
    {
        if (! in_array($this->status, [self::STATUS_QUEUED, self::STATUS_SENDING], true)) {
            return false;
        }

        $reference = $this->updated_at ?? $this->created_at;

        return $reference !== null && $reference->lt(now()->subMinutes($minutes));
    }
}
