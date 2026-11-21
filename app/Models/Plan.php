<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A purchasable (or internal) membership plan.
 *
 * Pricing rules are intentionally data-driven: the catalogue below is seeded
 * by PlanInstaller and can be adjusted from the admin console without a
 * deployment. The two price columns matter:
 *
 *   initial_price  one-off first payment (physical card + first period)
 *   price          recurring/renewal amount for members who already have a card
 */
class Plan extends Model
{
    use HasFactory;

    public const FREE = 'free';
    public const MONTHLY = 'monthly';
    public const ANNUAL = 'annual';
    public const FOUNDING = 'founding';
    public const EXECUTIVE = 'executive';
    public const STAFF = 'staff';

    protected $fillable = [
        'code',
        'name',
        'description',
        'currency',
        'initial_price',
        'price',
        'interval',
        'includes_card',
        'is_active',
        'is_public',
        'sort_order',
        'features',
    ];

    protected function casts(): array
    {
        return [
            'initial_price' => 'decimal:2',
            'price' => 'decimal:2',
            'includes_card' => 'boolean',
            'is_active' => 'boolean',
            'is_public' => 'boolean',
            'sort_order' => 'integer',
            'features' => 'array',
        ];
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    public function scopePurchasable($query)
    {
        return $query->where('is_active', true)
            ->where('is_public', true)
            ->whereNotIn('code', [self::FREE, self::FOUNDING, self::EXECUTIVE, self::STAFF]);
    }

    public function scopePubliclyVisible($query)
    {
        return $query->where('is_active', true)->where('is_public', true);
    }

    public function isFree(): bool
    {
        return $this->code === self::FREE;
    }

    public function isFounding(): bool
    {
        return $this->code === self::FOUNDING;
    }

    /** Internal roles are assigned by an administrator, never purchased. */
    public function isInternal(): bool
    {
        return in_array($this->code, [self::EXECUTIVE, self::STAFF], true);
    }

    /** Lifetime plans never expire and are never renewed or charged again. */
    public function isLifetime(): bool
    {
        return $this->isFounding() || $this->isInternal();
    }

    /** Consumed by Growth Network v1 when commission payouts are enabled. */
    public function earnsCommission(): bool
    {
        return (bool) $this->feature('earns_commission', false);
    }

    public function isRecurring(): bool
    {
        return $this->interval !== 'none';
    }

    /** Resolve an entitlement value; null means unlimited for limit keys. */
    public function feature(string $key, mixed $default = null): mixed
    {
        $features = $this->features ?? [];

        return array_key_exists($key, $features) ? $features[$key] : $default;
    }

    public function toApiArray(bool $includeFeatures = true): array
    {
        return [
            'code' => $this->code,
            'name' => $this->name,
            'description' => $this->description,
            'currency' => $this->currency,
            'initial_price' => (float) $this->initial_price,
            'price' => (float) $this->price,
            'interval' => $this->interval,
            'includes_card' => (bool) $this->includes_card,
            'is_active' => (bool) $this->is_active,
            'is_public' => (bool) $this->is_public,
            'sort_order' => (int) $this->sort_order,
        ] + ($includeFeatures ? ['features' => $this->features ?? []] : []);
    }
}
