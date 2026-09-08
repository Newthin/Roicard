<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MeetingTypeAvailability extends Model
{
    protected $table = 'meeting_type_availability';

    protected $fillable = [
        'meeting_type_id',
        'day_of_week',
        'start_time',
        'end_time',
    ];

    protected function casts(): array
    {
        return [
            'day_of_week' => 'integer',
        ];
    }

    public function meetingType()
    {
        return $this->belongsTo(MeetingType::class);
    }
}
