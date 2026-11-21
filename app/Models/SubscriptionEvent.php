<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Append-only audit trail for subscription lifecycle changes.
 *
 * Balance-style state is never inferred from this table; it exists so support
 * and finance can explain why a member has (or lost) access.
 */
class SubscriptionEvent extends Model
{
    protected $fillable = [
        'subscription_id',
        'user_id',
        'type',
        'data',
    ];

    protected function casts(): array
    {
        return [
            'data' => 'array',
        ];
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
