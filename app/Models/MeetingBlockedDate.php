<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MeetingBlockedDate extends Model
{
    protected $fillable = [
        'user_id',
        'start_date',
        'end_date',
        'reason',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Check if a given date falls within this blocked range.
     */
    public function coversDate(\DateTimeInterface $date): bool
    {
        $d = \Carbon\Carbon::parse($date)->startOfDay();
        $start = $this->start_date instanceof \Carbon\Carbon
            ? $this->start_date->startOfDay()
            : \Carbon\Carbon::parse($this->start_date)->startOfDay();
        $end = $this->end_date
            ? ($this->end_date instanceof \Carbon\Carbon
                ? $this->end_date->endOfDay()
                : \Carbon\Carbon::parse($this->end_date)->endOfDay())
            : $start->copy()->endOfDay();

        return $d->gte($start) && $d->lte($end);
    }
}
