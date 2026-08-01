<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class DatabaseSeeder extends Seeder
{
    /**
     * ⚠️ LOCAL-DEV ONLY — password is shared and simple.
     * Never use this password in staging or production.
     * Each user MUST change it on first real login.
     */
    private const DEV_PASSWORD = 'password123';

    public function run(): void
    {
        Role::firstOrCreate(['name' => 'member', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);

        $this->call(InterestOptionSeeder::class);

        $admins = [
            [
                'first_name' => 'Ebenener',
                'last_name' => 'Akparibo',
                'email' => 'ebenener.akparibo@roicard.local', // placeholder — update with real email
            ],
            [
                'first_name' => 'Moses',
                'last_name' => 'Godsword',
                'email' => 'moses.godsword@roicard.local', // placeholder — update with real email
            ],
            [
                'first_name' => 'Admin',
                'last_name' => 'Roicard',
                'email' => 'admin.roicard@roicard.local', // placeholder — update with real email
            ],
        ];

        foreach ($admins as $adminData) {
            $admin = User::firstOrCreate(
                ['email' => $adminData['email']],
                [
                    'first_name' => $adminData['first_name'],
                    'last_name' => $adminData['last_name'],
                    'password' => Hash::make(self::DEV_PASSWORD),
                    'email_verified_at' => now(),
                    'status' => 'active',
                    'role' => 'admin',
                ]
            );
            $admin->assignRole('admin');
        }

        // Sample member for testing
        $member = User::firstOrCreate(
            ['email' => 'member@roicard.local'],
            [
                'first_name' => 'Sample',
                'last_name' => 'Member',
                'password' => Hash::make(self::DEV_PASSWORD),
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
                'slug' => 'samplemember',
                'is_live' => true,
                'completion_pct' => 60,
            ]
        );
    }
}
