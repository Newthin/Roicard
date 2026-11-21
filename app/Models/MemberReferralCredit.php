<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One non-cash referral credit movement.
 *
 * Positive `available` rows are spendable. `reserved` rows are held by a
 * pending checkout, `used` rows have been consumed, and `adjustment` rows carry
 * negative amounts after a refund of the payment that earned the credit.
 */
class MemberReferralCredit extends Model
{
    use HasFactory;

    public const STATUS_AVAILABLE = 'available';
    public const STATUS_RESERVED = 'reserved';
    public const STATUS_USED = 'used';
    public const STATUS_CANCELLED = 'cancelled';
    public const STATUS_EXPIRED = 'expired';
    public const STATUS_ADJUSTMENT = 'adjustment';

    protected $fillable = [
        'user_id',
        'earned_from_payment_id',
        'member_user_id',
        'executive_referral_id',
        'amount',
        'currency',
        'status',
        'expires_at',
        'reserved_at',
        'reserved_payment_id',
        'used_at',
        'used_payment_id',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'expires_at' => 'datetime',
            'reserved_at' => 'datetime',
            'used_at' => 'datetime',
            'meta' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function earnedFromPayment(): BelongsTo
    {
        return $this->belongsTo(Payment::class, 'earned_from_payment_id');
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(User::class, 'member_user_id');
    }

    public function referral(): BelongsTo
    {
        return $this->belongsTo(ExecutiveReferral::class, 'executive_referral_id');
    }

    public function reservedPayment(): BelongsTo
    {
        return $this->belongsTo(Payment::class, 'reserved_payment_id');
    }

    public function usedPayment(): BelongsTo
    {
        return $this->belongsTo(Payment::class, 'used_payment_id');
    }
}
