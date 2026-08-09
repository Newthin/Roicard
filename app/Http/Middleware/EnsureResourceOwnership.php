<?php

namespace App\Http\Middleware;

use App\Models\AchievementEntry;
use App\Models\EducationEntry;
use App\Models\ExperienceEntry;
use App\Models\Profile;
use App\Models\User;
use Closure;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Symfony\Component\HttpFoundation\Response;

/**
 * Ensure the route-bound resource belongs to the authenticated user.
 *
 * Supports three shapes of ownership:
 *  1. Direct ownership — the model has a `user_id` column.
 *  2. Profile-scoped resources (education/experience/achievement) that belong
 *     to the user through their Profile (`profile_id`).
 *  3. Spatie Media attachments whose `model_type`/`model_id` point at the
 *     user's Profile (e.g. CV uploads).
 *
 * Registered as the `owns` route middleware alias in bootstrap/app.php.
 */
class EnsureResourceOwnership
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            abort(403, 'Unauthenticated.');
        }

        foreach ($request->route()->parameters() as $parameter) {
            if ($parameter instanceof Model) {
                $this->assertOwned($parameter, $user);
            }
        }

        return $next($request);
    }

    protected function assertOwned(Model $resource, User $user): void
    {
        // 1. Direct user-owned resource (user_id column on the model).
        $userId = $resource->getAttribute('user_id');
        if ($userId !== null) {
            $this->abortUnless((string) $userId === (string) $user->getKey());
            return;
        }

        // 2. Profile-scoped enrichment entries.
        if ($resource instanceof EducationEntry
            || $resource instanceof ExperienceEntry
            || $resource instanceof AchievementEntry) {
            $this->abortUnless(
                $resource->profile_id !== null
                && (string) $resource->profile_id === (string) $user->profile?->id
            );
            return;
        }

        // 3. Spatie Media attachments owned through the user's profile.
        if ($resource instanceof Media) {
            $owned = $resource->model_type === Profile::class
                && (string) $resource->model_id === (string) $user->profile?->id;
            $this->abortUnless($owned);
            return;
        }

        abort(403, 'Resource does not belong to this account.');
    }

    protected function abortUnless(bool $owned): void
    {
        if (!$owned) {
            abort(403, 'Resource does not belong to this account.');
        }
    }
}
