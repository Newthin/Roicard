<?php

namespace App\Models;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A discount campaign (e.g. NLF) that members can claim with a code at
 * registration or checkout. Each campaign defines the activation fee its
 * members pay, plus an optional window and an admin-controlled open/closed
 * flag. Pricing is always resolved from here — never hardcoded.
 */
class DiscountCampaign extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'name',
        'amount',
        'starts_at',
        'expires_at',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'float',
            'starts_at' => 'datetime',
            'expires_at' => 'datetime',
            'is_active' => 'boolean',
        ];
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'discount_campaign_id');
    }

    /** A campaign is claimable only while open and inside its window. */
    public function isLive(?CarbonInterface $at = null): bool
    {
        $at ??= now();

        if (! $this->is_active) {
            return false;
        }

        if ($this->starts_at && $this->starts_at->isAfter($at)) {
            return false;
        }

        if ($this->expires_at && $this->expires_at->isBefore($at)) {
            return false;
        }

        return true;
    }
}
