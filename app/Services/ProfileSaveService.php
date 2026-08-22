<?php

namespace App\Services;

use App\Models\InterestOption;
use App\Models\Profile;
use App\Models\User;

/**
 * Single source of truth for persisting validated profile payloads.
 *
 * Used by BOTH the member's own profile flow (ProfileController@update) and
 * the admin edit flow (AdminController@updateUserProfile) so admin edits go
 * through exactly the same validation (ProfileRequest) and application logic
 * as member edits — never a looser or stricter parallel path.
 */
class ProfileSaveService
{
    /**
     * Apply a validated payload (ProfileRequest::validated() shape) to the
     * user's name fields and their profile. Creates the profile if missing.
     */
    public function save(User $user, array $data): Profile
    {
        // Update user name fields if provided (email is not changed here —
        // account email changes go through the dedicated account endpoint)
        $userFields = array_filter([
            'first_name' => $data['first_name'] ?? null,
            'last_name' => $data['last_name'] ?? null,
        ]);
        if ($userFields) {
            $user->update($userFields);
        }

        // Update profile (create if it doesn't exist yet)
        $profile = $user->profile()->firstOrCreate([]);

        // Decode interests JSON string into an array (empty array if invalid)
        $interests = null;
        if (!empty($data['interests'])) {
            $decoded = json_decode($data['interests'], true);
            $interests = is_array($decoded) ? array_values(array_filter($decoded, 'is_string')) : [];
        }

        // Sync interest options pivot table — create missing options so every
        // saved interest becomes a selectable option for other members too.
        if (is_array($interests)) {
            $interestOptionIds = [];
            foreach ($interests as $name) {
                $option = InterestOption::firstOrCreate(
                    ['name' => $name],
                    ['sort_order' => InterestOption::max('sort_order') + 1]
                );
                $interestOptionIds[] = $option->id;
            }
            $profile->interestOptions()->sync($interestOptionIds);
        }

        $profileFields = array_filter([
            'title' => $data['title'] ?? null,
            'role_description' => $data['role_description'] ?? null,
            'organisation' => $data['organisation'] ?? null,
            'whatsapp_phone' => $data['whatsapp_phone'] ?? null,
            'phone' => $data['phone'] ?? null,
            'date_of_birth' => $data['date_of_birth'] ?? null,
            'gender' => $data['gender'] ?? null,
            'interests' => is_array($interests) ? $interests : null,
            'location' => $data['location'] ?? null,
            'bio' => $data['bio'] ?? null,
            'seeking' => $data['seeking'] ?? null,
            'offering' => $data['offering'] ?? null,
            'is_live' => $data['is_live'] ?? null,
        ], fn ($value) => $value !== null);
        if ($profileFields) {
            $profile->update($profileFields);
        }

        // Handle social links
        if (!empty($data['social_links'])) {
            $links = json_decode($data['social_links'], true);
            if (is_array($links)) {
                $profile->socialLinks()->delete();
                foreach ($links as $platform => $value) {
                    if (!empty($value)) {
                        $profile->socialLinks()->create([
                            'platform' => $platform,
                            'value' => $value,
                        ]);
                    }
                }
            }
        }

        $profile->recalculateCompletion();

        // Bust the public profile cache so changes are visible immediately
        $profile->bustPublicCache();

        return $profile->fresh() ?? $profile;
    }
}
