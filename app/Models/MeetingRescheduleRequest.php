<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MeetingRescheduleRequest extends Model
{
    const STATUS_PENDING = 'pending';
    const STATUS_ACCEPTED = 'accepted';
    const STATUS_DECLINED = 'declined';
    const STATUS_EXPIRED = 'expired';

    protected $fillable = [
        'booking_id',
        'requested_by_user_id',
        'proposed_start_time',
        'proposed_end_time',
        'status',
        'reason',
        'responded_at',
    ];

    protected function casts(): array
    {
        return [
            'proposed_start_time' => 'datetime',
            'proposed_end_time' => 'datetime',
            'responded_at' => 'datetime',
        ];
    }

    public function booking()
    {
        return $this->belongsTo(MeetingBooking::class, 'booking_id');
    }

    public function requestedBy()
    {
        return $this->belongsTo(User::class, 'requested_by_user_id');
    }

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }
}
