<?php

namespace App\Observers;

use App\Models\User;

class UserObserver
{
    public function created(User $user): void
    {
        if ($user->role === 'admin') {
            $user->assignRole('admin');
        } else {
            $user->assignRole('member');
        }
    }
}
