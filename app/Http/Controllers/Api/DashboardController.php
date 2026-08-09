<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AnalyticsEvent;
use App\Models\Connection;
use App\Models\Profile;
use App\Models\SmartCard;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function index(): JsonResponse
    {
        $userId = auth()->id();
        $user = auth()->user();

        // Profile scoped strictly to the authenticated user — never rely on a
        // relationship that could resolve to a different account. Media is
        // loaded explicitly so the avatar URL is available without lazy hits.
        $profile = Profile::where('user_id', $userId)
            ->with('media')
            ->first();

        // Smart card / connections / analytics are all scoped to this user.
        $smartCard = SmartCard::where('user_id', $userId)->first();

        $connectionCount = Connection::where('member_id', $userId)->count();
        $pendingConnections = Connection::where('member_id', $userId)
            ->where('status', 'pending')
            ->count();

        $totalViews = AnalyticsEvent::where('member_id', $userId)->count();

        $unreadNotifications = $user->unreadNotifications()->count();

        // Return the avatar as a clean string (no nested media array).
        $profilePayload = $profile ? $profile->toArray() : null;
        if ($profilePayload) {
            unset($profilePayload['media']);
            $avatar = $profile->getFirstMediaUrl('avatar') ?: null;
            $profilePayload['avatar'] = $avatar;
            $profilePayload['avatar_url'] = $avatar;
        }

        return response()->json([
            'user' => $user->only(['id', 'first_name', 'last_name', 'email', 'status', 'role']),
            'profile' => $profilePayload,
            'smart_card' => $smartCard,
            'stats' => [
                'total_views' => $totalViews,
                'connections' => $connectionCount,
                'pending_connections' => $pendingConnections,
                'unread_notifications' => $unreadNotifications,
            ],
        ]);
    }
}