<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ExperienceEntry extends Model
{
    protected $fillable = [
        'profile_id',
        'title',
        'company',
        'start_date',
        'end_date',
        'location',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
        ];
    }

    public function profile()
    {
        return $this->belongsTo(Profile::class);
    }
}
