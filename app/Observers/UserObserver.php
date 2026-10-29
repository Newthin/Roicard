<?php

namespace App\Observers;

use App\Models\User;
use Spatie\Permission\Models\Role;

class UserObserver
{
    public function created(User $user): void
    {
        $role = $user->role === 'admin' ? 'admin' : 'member';

        // The `role` column is the source of truth for routing. The Spatie
        // role is a secondary convenience, so a deployment that has not run
        // the seeder yet must not turn account creation into a 500.
        if (Role::where('name', $role)->where('guard_name', 'web')->exists()) {
            $user->assignRole($role);
        }
    }
}
