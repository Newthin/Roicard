<?php

namespace App\Http\Middleware;

use App\Models\AchievementEntry;
use App\Models\EducationEntry;
use App\Models\ExperienceEntry;
use App\Models\MeetingBooking;
use App\Models\MeetingRescheduleRequest;
use App\Models\MeetingType;
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
 * Supports four shapes of ownership:
 *  1. Direct ownership — the model has a `user_id` column (MeetingType, etc.).
 *  2. Host ownership — the model has a `host_user_id` column (MeetingBooking).
 *  3. Profile-scoped resources (education/experience/achievement) that belong
 *     to the user through their Profile (`profile_id`).
 *  4. Spatie Media attachments whose `model_type`/`model_id` point at the
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

        // 2. Meeting booking owned through host_user_id.
        if ($resource instanceof MeetingBooking) {
            $this->abortUnless(
                (string) $resource->getAttribute('host_user_id') === (string) $user->getKey()
            );
            return;
        }

        // 2b. Reschedule request owned through the parent booking's host_user_id.
        if ($resource instanceof MeetingRescheduleRequest) {
            $booking = $resource->booking;
            if (!$booking) {
                abort(403, 'Resource does not belong to this account.');
            }
            $this->abortUnless(
                (string) $booking->getAttribute('host_user_id') === (string) $user->getKey()
            );
            return;
        }

        // 3. Profile-scoped enrichment entries.
        if ($resource instanceof EducationEntry
            || $resource instanceof ExperienceEntry
            || $resource instanceof AchievementEntry) {
            $this->abortUnless(
                $resource->profile_id !== null
                && (string) $resource->profile_id === (string) $user->profile?->id
            );
            return;
        }

        // 4. Spatie Media attachments owned through the user's profile.
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
