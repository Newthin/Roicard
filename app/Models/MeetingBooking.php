<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MeetingBooking extends Model
{
    /** Booking statuses */
    const STATUS_PENDING = 'pending';
    const STATUS_CONFIRMED = 'confirmed';
    const STATUS_DECLINED = 'declined';
    const STATUS_RESCHEDULE_REQUESTED = 'reschedule_requested';
    const STATUS_CANCELLED = 'cancelled';
    const STATUS_COMPLETED = 'completed';
    const STATUS_EXPIRED = 'expired';

    protected $fillable = [
        'meeting_type_id',
        'host_user_id',
        'guest_user_id',
        'status',
        'guest_name',
        'guest_email',
        'guest_phone',
        'guest_notes',
        'guest_cancellation_token',
        'start_time',
        'end_time',
        'timezone',
        'host_timezone',
        'type_name',
        'type_description',
        'type_duration_minutes',
        'type_format',
        'type_location_detail',
        'cancelled_at',
        'cancelled_by',
        'cancellation_reason',
        'confirmed_at',
        'host_notes',
    ];

    protected $hidden = [
        'guest_cancellation_token',
    ];

    protected function casts(): array
    {
        return [
            'start_time' => 'datetime',
            'end_time' => 'datetime',
            'type_duration_minutes' => 'integer',
            'confirmed_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'responded_at' => 'datetime',
        ];
    }

    public function meetingType()
    {
        return $this->belongsTo(MeetingType::class);
    }

    public function host()
    {
        return $this->belongsTo(User::class, 'host_user_id');
    }

    public function guestUser()
    {
        return $this->belongsTo(User::class, 'guest_user_id');
    }

    public function rescheduleRequests()
    {
        return $this->hasMany(MeetingRescheduleRequest::class, 'booking_id');
    }

    public function customAnswers()
    {
        return $this->hasMany(MeetingCustomAnswer::class, 'booking_id');
    }

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    public function isConfirmed(): bool
    {
        return $this->status === self::STATUS_CONFIRMED;
    }

    public function isCancelled(): bool
    {
        return $this->status === self::STATUS_CANCELLED;
    }

    public function isActive(): bool
    {
        return in_array($this->status, [self::STATUS_PENDING, self::STATUS_CONFIRMED]);
    }

    /**
     * Snapshot meeting type details at booking time. This preserves
     * historical accuracy — changing the meeting type later must not
     * modify existing bookings.
     */
    public static function snapshotFromType(MeetingType $type): array
    {
        return [
            'type_name' => $type->name,
            'type_description' => $type->description,
            'type_duration_minutes' => $type->duration_minutes,
            'type_format' => $type->format,
            'type_location_detail' => $type->location_detail,
        ];
    }
}
