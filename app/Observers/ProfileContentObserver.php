<?php

namespace App\Observers;

use App\Models\AchievementEntry;
use App\Models\EducationEntry;
use App\Models\ExperienceEntry;
use App\Models\SocialLink;

/**
 * Busts the owner profile's public cache whenever any of its related content
 * records change. Education, experience, achievements and social links are
 * all part of the public profile payload, but none of them touch the profile
 * row itself, so the ProfileObserver::saved() hook never fires for them.
 */
class ProfileContentObserver
{
    public function created(AchievementEntry|EducationEntry|ExperienceEntry|SocialLink $model): void
    {
        $model->profile?->bustPublicCache();
    }

    public function updated(AchievementEntry|EducationEntry|ExperienceEntry|SocialLink $model): void
    {
        $model->profile?->bustPublicCache();
    }

    public function deleted(AchievementEntry|EducationEntry|ExperienceEntry|SocialLink $model): void
    {
        $model->profile?->bustPublicCache();
    }
}
