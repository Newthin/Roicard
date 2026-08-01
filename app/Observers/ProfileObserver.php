<?php

namespace App\Observers;

use App\Models\EducationEntry;
use App\Models\ExperienceEntry;
use App\Models\AchievementEntry;
use App\Models\Profile;
use App\Models\SocialLink;
use App\Services\SlugService;
use Illuminate\Support\Facades\Cache;

class ProfileObserver
{
    public function creating(Profile $profile): void
    {
        $this->ensureSlug($profile);
    }

    public function updating(Profile $profile): void
    {
        $this->ensureSlug($profile);
    }

    public function saved(Profile $profile): void
    {
        $profile->recalculateCompletion();
        $this->clearCache($profile);
    }

    /** Generates a public URL slug for every profile, even before payment. */
    protected function ensureSlug(Profile $profile): void
    {
        if ($profile->slug !== null) {
            return;
        }

        $user = $profile->user;
        if (!$user || !$user->first_name) {
            return;
        }

        $profile->slug = app(SlugService::class)->generate($user->first_name, $user->last_name);
    }

    public function deleted(Profile $profile): void
    {
        $this->clearCache($profile);
    }

    protected function clearCache(Profile $profile): void
    {
        if ($profile->slug) {
            Cache::forget("public_profile:{$profile->slug}");
        }
    }
}
