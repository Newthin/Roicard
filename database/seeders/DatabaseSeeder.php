<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        Role::firstOrCreate(['name' => 'member', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);

        $admin = User::factory()->create([
            'first_name' => 'Admin',
            'last_name' => 'Roicard',
            'email' => 'admin@roicard.com',
            'password' => 'password',
            'status' => 'active',
            'role' => 'admin',
        ]);

        $admin->assignRole('admin');

        $member = User::factory()->create([
            'first_name' => 'Daniel',
            'last_name' => 'Mensah',
            'email' => 'daniel@roicard.com',
            'password' => 'password',
            'status' => 'active',
            'role' => 'member',
        ]);

        $member->assignRole('member');

        $member->profile()->create([
            'title' => 'Software Engineer',
            'organisation' => 'Roicard Inc.',
            'whatsapp_phone' => '+233501234567',
            'location' => 'Accra, Ghana',
            'bio' => 'Full-stack developer passionate about building great products.',
            'slug' => 'danielmensah',
            'is_live' => true,
            'completion_pct' => 60,
        ]);
    }
}
