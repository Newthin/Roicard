<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SmartCard extends Model
{
    // Inventory lifecycle statuses (admin card management)
    public const STATUS_AVAILABLE = 'available';
    public const STATUS_ASSIGNED = 'assigned';
    public const STATUS_ACTIVE = 'active';
    public const STATUS_DEACTIVATED = 'deactivated';

    protected $fillable = [
        'card_id',
        'user_id',
        'status',
        'inventory_status',
        'assigned_at',
        'delivery_name',
        'street_address',
        'city',
        'region',
        'country',
        'gps_address',
        'delivery_phone',
        'delivery_notes',
        'dispatched_at',
        'delivered_at',
    ];

    protected function casts(): array
    {
        return [
            'dispatched_at' => 'datetime',
            'delivered_at' => 'datetime',
            'assigned_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public static function generateCardId(): string
    {
        $year = now()->year;
        $last = static::whereYear('created_at', $year)
            ->lockForUpdate()
            ->max('card_id');

        if ($last) {
            $num = (int) substr($last, -5) + 1;
        } else {
            $num = 1;
        }

        return sprintf('RC-%s-%05d', $year, $num);
    }
}
