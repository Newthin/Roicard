<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Connection extends Model
{
    protected $fillable = [
        'member_id',
        'guest_user_id',
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

    public function guestUser()
    {
        return $this->belongsTo(User::class, 'guest_user_id');
    }

    /**
     * Link previously submitted guest requests to a newly registered user so
     * their Guest Profile record transitions to their real account.
     */
    public static function linkGuestRequestsToUser(User $user): void
    {
        static::whereNull('guest_user_id')
            ->where('guest_email', $user->email)
            ->update(['guest_user_id' => $user->id]);
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
