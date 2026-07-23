<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Connection extends Model
{
    protected $fillable = [
        'member_id',
        'guest_name',
        'guest_email',
        'guest_phone',
        'guest_org',
        'status',
    ];

    public function member()
    {
        return $this->belongsTo(User::class, 'member_id');
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function approve(): void
    {
        $this->status = 'approved';
        $this->save();
    }

    public function decline(): void
    {
        $this->status = 'declined';
        $this->save();
    }
}
