<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

/**
 * Creates the application roles only.
 *
 * Safe to run in production and idempotent. Unlike DatabaseSeeder it does not
 * create demo users or set any passwords.
 *
 * Usage: php artisan db:seed --class=RoleSeeder --force
 */
class RoleSeeder extends Seeder
{
    public function run(): void
    {
        foreach (['member', 'admin'] as $role) {
            Role::firstOrCreate([
                'name' => $role,
                'guard_name' => 'web',
            ]);
        }
    }
}
