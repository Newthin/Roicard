<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AchievementEntry extends Model
{
    protected $fillable = [
        'profile_id',
        'title',
        'issuer',
        'date',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
        ];
    }

    public function profile()
    {
        return $this->belongsTo(Profile::class);
    }
}
