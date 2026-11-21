<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One visit to an executive short link. Events are never updated or deleted by
 * the application; only the nullable user_id is filled in when that visit
 * results in a successful registration.
 */
class ReferralClick extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'executive_referral_id',
        'user_id',
        'code',
        'ip_hash',
        'user_agent',
        'referrer',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    public function executiveReferral(): BelongsTo
    {
        return $this->belongsTo(ExecutiveReferral::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
