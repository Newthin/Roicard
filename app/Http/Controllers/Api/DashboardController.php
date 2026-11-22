<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AnalyticsEvent;
use App\Models\Connection;
use App\Models\MeetingBooking;
use App\Models\MeetingType;
use App\Models\Profile;
use App\Models\SmartCard;
use App\Services\MemberAccessService;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function index(): JsonResponse
    {
        $userId = auth()->id();
        $user = auth()->user();

        // Load the profile with the exact same relations as ProfileController::show()
        // (education, experience, achievements, socialLinks, user, media) so the
        // avatar and enrichment data match the profile page — while still scoped
        // strictly to the authenticated user.
        $profile = Profile::where('user_id', $userId)
            ->with(['education', 'experience', 'achievements', 'socialLinks', 'user', 'media'])
            ->first();

        // Smart card / connections / analytics are all scoped to this user.
        $smartCard = SmartCard::where('user_id', $userId)->first();

        $connectionCount = Connection::where('member_id', $userId)->count();
        $pendingConnections = Connection::where('member_id', $userId)
            ->where('status', 'pending')
            ->count();

        $totalViews = AnalyticsEvent::where('member_id', $userId)->count();

        $unreadNotifications = $user->unreadNotifications()->count();

        // Meeting management is a paid feature. Legacy bookings are still
        // counted so a downgraded member can find and cancel them.
        $canManageMeetings = $user->hasFeature('meetings');
        $meetingTypeCount = MeetingType::where('user_id', $userId)->count();
        $upcomingBookings = MeetingBooking::where('host_user_id', $userId)
            ->whereIn('status', ['pending', 'confirmed'])
            ->where('start_time', '>', now('UTC'))
            ->count();
        $pendingBookings = MeetingBooking::where('host_user_id', $userId)
            ->where('status', 'pending')
            ->count();

        // Return the avatar as a clean string (no nested media array).
        $profilePayload = $profile ? $profile->toArray() : null;
        if ($profilePayload) {
            unset($profilePayload['media']);
            $avatar = $profile->getFirstMediaUrl('avatar') ?: null;
            $profilePayload['avatar'] = $avatar;
            $profilePayload['avatar_url'] = $avatar;
        }

        return response()->json([
            // Canonical member payload: account status stays separate from the
            // billing membership state so the dashboard can show the right plan
            // and upgrade prompt after an expiry or downgrade.
            'user' => app(MemberAccessService::class)->payload($user),
            'profile' => $profilePayload,
            'smart_card' => $smartCard,
            'stats' => [
                'total_views' => $totalViews,
                'connections' => $connectionCount,
                'pending_connections' => $pendingConnections,
                'unread_notifications' => $unreadNotifications,
                'meeting_types' => $canManageMeetings ? $meetingTypeCount : 0,
                'upcoming_bookings' => $upcomingBookings,
                'pending_bookings' => $pendingBookings,
            ],
        ]);
    }
}