<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AnalyticsEvent;
use App\Models\Connection;
use App\Models\SmartCard;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function index(): JsonResponse
    {
        $user = auth()->user()->load('profile');
        $profile = $user->profile;

        $smartCard = SmartCard::where('user_id', $user->id)->first();

        $connectionCount = Connection::where('member_id', $user->id)->count();
        $pendingConnections = Connection::where('member_id', $user->id)
            ->where('status', 'pending')
            ->count();

        $totalViews = AnalyticsEvent::where('member_id', $user->id)->count();

        $unreadNotifications = $user->unreadNotifications()->count();

        return response()->json([
            'user' => $user->only(['id', 'first_name', 'last_name', 'email', 'status', 'role']),
            'profile' => $profile,
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
