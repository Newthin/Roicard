<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Admin-controlled payout policy. There is exactly one row (id = 1); defaults
 * come from config so a fresh deployment is usable without an extra seeder.
 */
class PayoutSetting extends Model
{
    protected $fillable = [
        'minimum_amount',
        'cadence_days',
        'is_enabled',
        'last_generated_at',
    ];

    protected function casts(): array
    {
        return [
            'minimum_amount' => 'decimal:2',
            'cadence_days' => 'integer',
            'is_enabled' => 'boolean',
            'last_generated_at' => 'datetime',
        ];
    }

    public static function current(): self
    {
        return static::firstOrCreate(['id' => 1], [
            'minimum_amount' => config('roicard.growth.payout.minimum', 100),
            'cadence_days' => config('roicard.growth.payout.cadence_days', 14),
            'is_enabled' => true,
            'last_generated_at' => null,
        ]);
    }
}
