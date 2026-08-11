<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SocialLinksRequest;
use App\Models\AchievementEntry;
use App\Models\EducationEntry;
use App\Models\ExperienceEntry;
use App\Models\Profile;
use App\Models\SocialLink;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

class ProfileEnrichmentController extends Controller
{
    protected function profile()
    {
        return auth()->user()->profile()->firstOrFail();
    }

    public function uploadCv(Request $request): JsonResponse
    {
        $request->validate([
            'cv' => ['required', 'file', 'mimes:pdf,doc,docx', 'max:10240'],
            'visible' => ['nullable', 'boolean'],
        ]);

        $profile = $this->profile();
        $profile->addMedia($request->file('cv'))
            ->withCustomProperties(['visible' => $request->boolean('visible', false)])
            ->toMediaCollection('cv');

        // Media writes don't save the profile row, so the observer doesn't
        // fire — bust the public cache so the CV is visible immediately.
        $profile->bustPublicCache();

        return response()->json([
            'message' => 'CV uploaded successfully',
            'cv' => $profile->getMedia('cv')->last(),
        ]);
    }

    public function deleteCv(Media $media): JsonResponse
    {
        $profile = $this->profile();

        // Defense-in-depth: the owns middleware already bound this media to the
        // current profile — double-check the polymorphic owner and that it is
        // actually a CV before deleting.
        if ($media->model_type !== Profile::class
            || (string) $media->model_id !== (string) $profile->id
            || $media->collection_name !== 'cv') {
            abort(403, 'Resource does not belong to this account.');
        }

        $media->delete();

        $profile->bustPublicCache();

        return response()->json(['message' => 'CV deleted']);
    }

    public function storeEducation(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'institution' => ['required', 'string', 'max:255'],
            'degree' => ['required', 'string', 'max:255'],
            'start_year' => ['required', 'integer', 'min:1900', 'max:' . (now()->year + 10)],
            'end_year' => ['nullable', 'integer', 'min:1900', 'max:' . (now()->year + 10)],
            'honours' => ['nullable', 'string', 'max:255'],
        ]);

        $entry = $this->profile()->education()->create($validated);

        return response()->json(['education' => $entry, 'message' => 'Education entry added'], 201);
    }

    public function updateEducation(EducationEntry $education, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'institution' => ['required', 'string', 'max:255'],
            'degree' => ['required', 'string', 'max:255'],
            'start_year' => ['required', 'integer', 'min:1900', 'max:' . (now()->year + 10)],
            'end_year' => ['nullable', 'integer', 'min:1900', 'max:' . (now()->year + 10)],
            'honours' => ['nullable', 'string', 'max:255'],
        ]);

        // The owns middleware already guarantees this entry belongs to the
        // current user; the scoped find keeps that guarantee explicit.
        $entry = $this->profile()->education()->findOrFail($education->getKey());
        $entry->update($validated);

        return response()->json(['education' => $entry, 'message' => 'Education entry updated']);
    }

    public function destroyEducation(EducationEntry $education): JsonResponse
    {
        $entry = $this->profile()->education()->findOrFail($education->getKey());
        $entry->delete();

        return response()->json(['message' => 'Education entry deleted']);
    }

    public function storeExperience(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'company' => ['required', 'string', 'max:255'],
            'start_date' => ['required', 'date'],
            'end_date' => ['nullable', 'date', 'after:start_date'],
            'location' => ['nullable', 'string', 'max:255'],
        ]);

        $entry = $this->profile()->experience()->create($validated);

        return response()->json(['experience' => $entry, 'message' => 'Experience entry added'], 201);
    }

    public function updateExperience(ExperienceEntry $experience, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'company' => ['required', 'string', 'max:255'],
            'start_date' => ['required', 'date'],
            'end_date' => ['nullable', 'date', 'after:start_date'],
            'location' => ['nullable', 'string', 'max:255'],
        ]);

        // Owned via the owns middleware; scoped find keeps the guarantee explicit.
        $entry = $this->profile()->experience()->findOrFail($experience->getKey());
        $entry->update($validated);

        return response()->json(['experience' => $entry, 'message' => 'Experience entry updated']);
    }

    public function destroyExperience(ExperienceEntry $experience): JsonResponse
    {
        $entry = $this->profile()->experience()->findOrFail($experience->getKey());
        $entry->delete();

        return response()->json(['message' => 'Experience entry deleted']);
    }

    public function storeAchievement(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'issuer' => ['nullable', 'string', 'max:255'],
            'date' => ['nullable', 'date'],
        ]);

        $entry = $this->profile()->achievements()->create($validated);

        return response()->json(['achievement' => $entry, 'message' => 'Achievement added'], 201);
    }

    public function updateAchievement(AchievementEntry $achievement, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'issuer' => ['nullable', 'string', 'max:255'],
            'date' => ['nullable', 'date'],
        ]);

        // Owned via the owns middleware; scoped find keeps the guarantee explicit.
        $entry = $this->profile()->achievements()->findOrFail($achievement->getKey());
        $entry->update($validated);

        return response()->json(['achievement' => $entry, 'message' => 'Achievement updated']);
    }

    public function destroyAchievement(AchievementEntry $achievement): JsonResponse
    {
        $entry = $this->profile()->achievements()->findOrFail($achievement->getKey());
        $entry->delete();

        return response()->json(['message' => 'Achievement deleted']);
    }

    public function updateSocialLinks(SocialLinksRequest $request): JsonResponse
    {
        $profile = $this->profile();
        $profile->socialLinks()->delete();

        $links = collect($request->links)->map(function ($link) use ($profile) {
            return SocialLink::create([
                'profile_id' => $profile->id,
                'platform' => $link['platform'],
                'value' => $link['value'],
            ]);
        });

        return response()->json([
            'social_links' => $links,
            'message' => 'Social links updated',
        ]);
    }
}
