<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Backfill `users.onboarding_completed_at` for members who already finished
 * the journey before the server started recording it.
 *
 * Historically onboarding completion was only tracked in the browser's
 * localStorage, while the server flag was set solely by ProfileController
 * update. Members who completed onboarding earlier therefore look "new" to
 * the API and get bounced back into the journey.
 *
 * Only accounts with real profile content are marked complete — an empty
 * profile means the member never actually finished onboarding.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('users') || !Schema::hasTable('profiles')) {
            return;
        }

        $hasEducation = Schema::hasTable('education_entries');
        $hasExperience = Schema::hasTable('experience_entries');
        $hasAchievements = Schema::hasTable('achievement_entries');

        DB::table('users')
            ->whereNull('onboarding_completed_at')
            ->whereNull('deleted_at')
            ->orderBy('id')
            ->chunkById(500, function ($users) use ($hasEducation, $hasExperience, $hasAchievements) {
                foreach ($users as $user) {
                    $profile = DB::table('profiles')->where('user_id', $user->id)->first();

                    if (!$profile) {
                        continue;
                    }

                    $hasContent = $this->hasProfileContent($profile)
                        || ($hasEducation && DB::table('education_entries')->where('profile_id', $profile->id)->exists())
                        || ($hasExperience && DB::table('experience_entries')->where('profile_id', $profile->id)->exists())
                        || ($hasAchievements && DB::table('achievement_entries')->where('profile_id', $profile->id)->exists());

                    if (!$hasContent) {
                        continue;
                    }

                    DB::table('users')->where('id', $user->id)->update([
                        'onboarding_completed_at' => $profile->updated_at
                            ?? $user->created_at
                            ?? now(),
                    ]);
                }
            });
    }

    /**
     * Not reversible: clearing the timestamp could re-trap members in the
     * onboarding loop, and the original values were never recorded.
     */
    public function down(): void
    {
        // intentionally no-op
    }

    protected function hasProfileContent(object $profile): bool
    {
        foreach (['title', 'role_description', 'organisation', 'bio', 'location', 'seeking', 'offering'] as $field) {
            if (property_exists($profile, $field) && $profile->{$field} !== null && $profile->{$field} !== '') {
                return true;
            }
        }

        return false;
    }
};
