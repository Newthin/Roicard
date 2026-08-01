<?php

namespace Database\Seeders;

use App\Models\InterestOption;
use Illuminate\Database\Seeder;

class InterestOptionSeeder extends Seeder
{
    public function run(): void
    {
        $interests = [
            'Technology',
            'Entrepreneurship',
            'Leadership',
            'Networking',
            'Personal Branding',
            'Career Growth',
            'Business',
            'Creative Arts',
        ];

        foreach ($interests as $index => $name) {
            InterestOption::updateOrCreate(
                ['name' => $name],
                ['sort_order' => $index + 1, 'is_active' => true]
            );
        }
    }
}
