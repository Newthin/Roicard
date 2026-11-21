<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    /** What the payment was for. */
    public const PURPOSE_INITIAL = 'initial';
    public const PURPOSE_RENEWAL = 'renewal';
    public const PURPOSE_UPGRADE = 'upgrade';
    public const PURPOSE_LEGACY = 'legacy_activation';
    public const PURPOSE_ADMIN_GRANT = 'admin_grant';

    protected $fillable = [
        'user_id',
        'plan_id',
        'subscription_id',
        'referral_user_id',
        'amount',
        'referral_discount_amount',
        'referral_credit_applied',
        'currency',
        'method',
        'purpose',
        'period_start',
        'period_end',
        'meta',
        'momo_number',
        'status',
        'provider_reference',
        'provider',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'referral_discount_amount' => 'decimal:2',
            'referral_credit_applied' => 'decimal:2',
            'period_start' => 'datetime',
            'period_end' => 'datetime',
            'meta' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }

    public function referralUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'referral_user_id');
    }

    public function isCompleted(): bool
    {
        return $this->status === 'success';
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    /** True once the subscription side effects have been applied. */
    public function isApplied(): bool
    {
        return !empty(($this->meta ?? [])['applied_at']);
    }
}
