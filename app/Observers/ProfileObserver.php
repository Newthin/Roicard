<?php

namespace App\Observers;

use App\Models\EducationEntry;
use App\Models\ExperienceEntry;
use App\Models\AchievementEntry;
use App\Models\Profile;
use App\Models\SocialLink;
use Illuminate\Support\Facades\Cache;

class ProfileObserver
{
    public function saved(Profile $profile): void
    {
        $profile->recalculateCompletion();
        $this->clearCache($profile);
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
