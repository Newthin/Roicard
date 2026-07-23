<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SocialLink extends Model
{
    protected $fillable = [
        'profile_id',
        'platform',
        'value',
    ];

    public function profile()
    {
        return $this->belongsTo(Profile::class);
    }
}
