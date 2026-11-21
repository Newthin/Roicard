<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Stable referral code belonging to one Executive plan holder.
 *
 * The code is deliberately ambiguous-character free so it can be read aloud,
 * printed on a card, or typed from a QR-scanned link.
 */
class ExecutiveReferral extends Model
{
    use HasFactory;

    public const CODE_LENGTH = 10;

    public const CODE_PATTERN = '/^[A-HJ-NP-Z2-9]{10}$/';

    private const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    protected $fillable = [
        'user_id',
        'code',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** Generate a unique code, retrying on the extremely unlikely collision. */
    public static function generateCode(): string
    {
        do {
            $code = '';

            for ($i = 0; $i < self::CODE_LENGTH; $i++) {
                $code .= self::ALPHABET[random_int(0, strlen(self::ALPHABET) - 1)];
            }
        } while (self::where('code', $code)->exists());

        return $code;
    }
}
