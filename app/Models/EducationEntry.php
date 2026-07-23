<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EducationEntry extends Model
{
    protected $fillable = [
        'profile_id',
        'institution',
        'degree',
        'start_year',
        'end_year',
        'honours',
    ];

    protected function casts(): array
    {
        return [
            'start_year' => 'integer',
            'end_year' => 'integer',
        ];
    }

    public function profile()
    {
        return $this->belongsTo(Profile::class);
    }
}
