<?php

namespace App\Services;

use App\Models\Profile;
use Illuminate\Support\Str;

class SlugService
{
    public function generate(string $firstName, string $lastName): string
    {
        $base = Str::slug($firstName . ' ' . $lastName);
        $slug = $base;
        $counter = 1;

        while (Profile::where('slug', $slug)->exists()) {
            $slug = $base . $counter;
            $counter++;
        }

        return $slug;
    }
}
