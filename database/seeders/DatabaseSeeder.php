<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        Role::firstOrCreate(['name' => 'member', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);

        $admin = User::firstOrCreate(
            ['email' => 'admin@roicard.com'],
            [
                'first_name' => 'Admin',
                'last_name' => 'Roicard',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
                'status' => 'active',
                'role' => 'admin',
            ]
        );

        $admin->assignRole('admin');

        $member = User::firstOrCreate(
            ['email' => 'daniel@roicard.com'],
            [
                'first_name' => 'Daniel',
                'last_name' => 'Mensah',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
                'status' => 'active',
                'role' => 'member',
            ]
        );

        $member->assignRole('member');

        $member->profile()->updateOrCreate(
            ['user_id' => $member->id],
            [
                'title' => 'Software Engineer',
                'organisation' => 'Roicard Inc.',
                'whatsapp_phone' => '+233501234567',
                'location' => 'Accra, Ghana',
                'bio' => 'Full-stack developer passionate about building great products.',
                'slug' => 'danielmensah',
                'is_live' => true,
                'completion_pct' => 60,
            ]
        );
    }
}
