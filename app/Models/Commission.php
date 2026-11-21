<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * A cash commission earned by an Executive from an attributed member payment.
 *
 * Rows are append-only except for the reversal fields. Batch inclusion is
 * tracked by PayoutBatchItem, so a commission can never be paid twice.
 */
class Commission extends Model
{
    use HasFactory;

    public const TYPE_FIRST_ANNUAL = 'first_annual';

    public const TYPE_ANNUAL_UPGRADE = 'annual_upgrade';

    public const TYPE_DISCOUNTED_ANNUAL = 'discounted_annual';

    public const STATUS_CLEARED = 'cleared';

    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'executive_user_id',
        'member_user_id',
        'executive_referral_id',
        'referral_click_id',
        'payment_id',
        'subscription_id',
        'type',
        'amount',
        'collected_amount',
        'currency',
        'status',
        'cleared_at',
        'cancelled_at',
        'cancellation_reason',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'collected_amount' => 'decimal:2',
            'cleared_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'meta' => 'array',
        ];
    }

    public function executive(): BelongsTo
    {
        return $this->belongsTo(User::class, 'executive_user_id');
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(User::class, 'member_user_id');
    }

    public function executiveReferral(): BelongsTo
    {
        return $this->belongsTo(ExecutiveReferral::class);
    }

    public function referralClick(): BelongsTo
    {
        return $this->belongsTo(ReferralClick::class);
    }

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }

    /** @return HasOne<PayoutBatchItem> */
    public function payoutBatchItem(): HasOne
    {
        return $this->hasOne(PayoutBatchItem::class);
    }

    public function scopeCleared(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_CLEARED);
    }

    public function isCleared(): bool
    {
        return $this->status === self::STATUS_CLEARED;
    }
}
