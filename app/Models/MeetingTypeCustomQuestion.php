<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MeetingTypeCustomQuestion extends Model
{
    protected $fillable = [
        'meeting_type_id',
        'question',
        'is_required',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'is_required' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function meetingType()
    {
        return $this->belongsTo(MeetingType::class);
    }
}
