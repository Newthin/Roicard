<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MeetingCustomAnswer extends Model
{
    protected $fillable = [
        'booking_id',
        'question',
        'answer',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
        ];
    }

    public function booking()
    {
        return $this->belongsTo(MeetingBooking::class, 'booking_id');
    }
}
