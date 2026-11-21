<?php

namespace App\Models;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * The single current subscription for a member.
 *
 * `status` is the billing lifecycle, deliberately separate from
 * `users.status` (account/membership access):
 *
 *   free      no paid plan, free entitlements
 *   active    paid period is valid
 *   grace     renewal failed/late; access retained until grace_ends_at
 *   expired   grace ended; paid features locked
 *   canceled  cancelled, still running to current_period_end
 *   founding  legacy one-time GHS 350 member; never expires
 *
 * Internal roles (executive/staff) use `active` with a null period end, so they
 * are permanent without inheriting founding's grandfathering rules.
 */
class Subscription extends Model
{
    use HasFactory;

    public const STATUS_FREE = 'free';
    public const STATUS_ACTIVE = 'active';
    public const STATUS_GRACE = 'grace';
    public const STATUS_EXPIRED = 'expired';
    public const STATUS_CANCELED = 'canceled';
    public const STATUS_FOUNDING = 'founding';

    protected $fillable = [
        'user_id',
        'plan_id',
        'status',
        'provider',
        'provider_reference',
        'provider_subscription_id',
        'started_at',
        'current_period_start',
        'current_period_end',
        'grace_ends_at',
        'cancel_at_period_end',
        'canceled_at',
        'ended_at',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'current_period_start' => 'datetime',
            'current_period_end' => 'datetime',
            'grace_ends_at' => 'datetime',
            'canceled_at' => 'datetime',
            'ended_at' => 'datetime',
            'cancel_at_period_end' => 'boolean',
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

    public function events(): HasMany
    {
        return $this->hasMany(SubscriptionEvent::class);
    }

    /** Access is retained during grace and for founding members. */
    public function isActive(): bool
    {
        return in_array($this->status, [
            self::STATUS_ACTIVE,
            self::STATUS_GRACE,
            self::STATUS_FOUNDING,
        ], true);
    }

    public function isFounding(): bool
    {
        return $this->status === self::STATUS_FOUNDING;
    }

    /** True for admin-assigned executive/staff roles. */
    public function isInternal(): bool
    {
        return $this->plan?->isInternal() === true;
    }

    /** Founding and internal roles have no end date and no renewal. */
    public function isLifetime(): bool
    {
        return $this->isFounding() || $this->isInternal() || !$this->current_period_end;
    }

    public function onGrace(): bool
    {
        return $this->status === self::STATUS_GRACE;
    }

    public function isExpired(): bool
    {
        return in_array($this->status, [self::STATUS_EXPIRED, self::STATUS_CANCELED], true);
    }

    public function endsAt(): ?CarbonInterface
    {
        return $this->current_period_end;
    }

    public function daysRemaining(): ?int
    {
        if ($this->isFounding() || !$this->current_period_end) {
            return null;
        }

        return max(0, (int) now()->diffInDays($this->current_period_end, false));
    }

    public function scopeActiveAccess($query)
    {
        return $query->whereIn('status', [
            self::STATUS_ACTIVE,
            self::STATUS_GRACE,
            self::STATUS_FOUNDING,
        ]);
    }
}
