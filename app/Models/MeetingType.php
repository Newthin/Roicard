<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MeetingType extends Model
{
    /**
     * Supported meeting formats.
     */
    const FORMAT_GOOGLE_MEET = 'google_meet';
    const FORMAT_ZOOM = 'zoom';
    const FORMAT_CUSTOM_LINK = 'custom_link';
    const FORMAT_IN_PERSON = 'in_person';
    const FORMAT_PHONE = 'phone';

    const FORMATS = [
        self::FORMAT_GOOGLE_MEET,
        self::FORMAT_ZOOM,
        self::FORMAT_CUSTOM_LINK,
        self::FORMAT_IN_PERSON,
        self::FORMAT_PHONE,
    ];

    const FORMAT_LABELS = [
        self::FORMAT_GOOGLE_MEET => 'Google Meet',
        self::FORMAT_ZOOM => 'Zoom',
        self::FORMAT_CUSTOM_LINK => 'Custom Virtual Link',
        self::FORMAT_IN_PERSON => 'In-Person',
        self::FORMAT_PHONE => 'Phone',
    ];

    protected $fillable = [
        'user_id',
        'name',
        'description',
        'duration_minutes',
        'format',
        'location_detail',
        'phone_number',
        'meeting_link',
        'buffer_minutes',
        'capacity',
        'is_active',
        'sort_order',
        'min_notice_hours',
        'advance_booking_days',
        'max_bookings_per_day',
    ];

    protected function casts(): array
    {
        return [
            'duration_minutes' => 'integer',
            'buffer_minutes' => 'integer',
            'capacity' => 'integer',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
            'min_notice_hours' => 'integer',
            'advance_booking_days' => 'integer',
            'max_bookings_per_day' => 'integer',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function availability()
    {
        return $this->hasMany(MeetingTypeAvailability::class);
    }

    public function bookings()
    {
        return $this->hasMany(MeetingBooking::class);
    }

    public function customQuestions()
    {
        return $this->hasMany(MeetingTypeCustomQuestion::class)->orderBy('sort_order');
    }

    /**
     * Active bookings (pending, confirmed, or reschedule_requested) that overlap a given time range.
     */
    public function activeBookingsDuring(\DateTimeInterface $start, \DateTimeInterface $end, ?int $excludeBookingId = null)
    {
        $query = $this->bookings()
            ->whereIn('status', [
                MeetingBooking::STATUS_PENDING,
                MeetingBooking::STATUS_CONFIRMED,
                MeetingBooking::STATUS_RESCHEDULE_REQUESTED,
            ])
            ->where('start_time', '<', $end)
            ->where('end_time', '>', $start);

        if ($excludeBookingId) {
            $query->where('id', '!=', $excludeBookingId);
        }

        return $query;
    }

    /**
     * Get the human-readable label for this meeting type's format.
     */
    public function getFormatLabelAttribute(): string
    {
        return self::FORMAT_LABELS[$this->format] ?? $this->format;
    }
}
