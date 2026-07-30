<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdminActionLog;
use App\Models\AnalyticsEvent;
use App\Models\Connection;
use App\Models\Payment;
use App\Models\SmartCard;
use App\Models\User;
use App\Notifications\SmartCardDeliveredNotification;
use App\Notifications\SmartCardShippedNotification;
use App\Traits\LogsAdminActions;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\QueryBuilder\QueryBuilder;

class AdminController extends Controller
{
    use LogsAdminActions;

    public function stats(): JsonResponse
    {
        return response()->json([
            'total_users' => User::count(),
            'active_users' => User::where('status', 'active')->count(),
            'draft_users' => User::where('status', 'draft')->count(),
            'total_payments' => Payment::count(),
            'successful_payments' => Payment::where('status', 'success')->count(),
            'total_revenue' => Payment::where('status', 'success')->sum('amount'),
            'total_smart_cards' => SmartCard::count(),
            'cards_shipped' => SmartCard::where('status', 'shipped')->count(),
            'cards_delivered' => SmartCard::where('status', 'delivered')->count(),
            'total_connections' => \App\Models\Connection::count(),
            'total_analytics_events' => AnalyticsEvent::count(),
            'recent_views_7d' => AnalyticsEvent::where('created_at', '>=', now()->subDays(7))->count(),
        ]);
    }

    public function users(Request $request): JsonResponse
    {
        $users = QueryBuilder::for(User::class)
            ->allowedFilters(['status', 'role', 'first_name', 'last_name', 'email'])
            ->allowedSorts(['created_at', 'first_name', 'last_name', 'email'])
            ->with('profile')
            ->paginate($request->input('per_page', 20));

        return response()->json($users);
    }

    public function updateUser(string $id, Request $request): JsonResponse
    {
        $request->validate([
            'status' => ['sometimes', 'string', 'in:draft,active'],
            'role' => ['sometimes', 'string', 'in:member,admin'],
        ]);

        $user = User::findOrFail($id);

        if ($request->has('status')) {
            $user->status = $request->status;
        }
        if ($request->has('role')) {
            $user->role = $request->role;
        }
        $user->save();

        $this->logAdminAction('update_user', $user->id);

        $changes = $request->only(['status', 'role']);
        return response()->json([
            'user' => $user->fresh(),
            'message' => 'User updated',
            'changes' => $changes,
        ]);
    }

    public function dispatchCard(string $id): JsonResponse
    {
        $smartCard = SmartCard::findOrFail($id);

        if ($smartCard->status !== 'in_production' && $smartCard->status !== 'pending') {
            return response()->json(['message' => 'Card cannot be dispatched from current status'], 400);
        }

        $smartCard->update([
            'status' => 'shipped',
            'dispatched_at' => now(),
        ]);

        $smartCard->user->notify(new SmartCardShippedNotification($smartCard));
        $this->logAdminAction('dispatch_card', $smartCard->user_id);

        return response()->json([
            'smart_card' => $smartCard->fresh(),
            'message' => 'Card marked as shipped',
        ]);
    }

    public function assignCard(string $id, Request $request): JsonResponse
    {
        $request->validate(['user_id' => ['required', 'integer', 'exists:users,id']]);

        $smartCard = SmartCard::findOrFail($id);
        $smartCard->update(['user_id' => $request->user_id]);

        $this->logAdminAction('assign_card', $request->user_id);

        return response()->json([
            'smart_card' => $smartCard->fresh()->load('user:id,first_name,last_name,email'),
            'message' => 'Card assigned to user',
        ]);
    }

    public function unassignCard(string $id): JsonResponse
    {
        $smartCard = SmartCard::findOrFail($id);
        $smartCard->update(['user_id' => null]);

        $this->logAdminAction('unassign_card');

        return response()->json([
            'smart_card' => $smartCard->fresh(),
            'message' => 'Card unassigned',
        ]);
    }

    public function deliverCard(string $id): JsonResponse
    {
        $smartCard = SmartCard::findOrFail($id);

        if ($smartCard->status !== 'shipped') {
            return response()->json(['message' => 'Card must be shipped before delivery'], 400);
        }

        $smartCard->update([
            'status' => 'delivered',
            'delivered_at' => now(),
        ]);

        $smartCard->user->notify(new SmartCardDeliveredNotification($smartCard));
        $this->logAdminAction('deliver_card', $smartCard->user_id);

        return response()->json([
            'smart_card' => $smartCard->fresh(),
            'message' => 'Card marked as delivered',
        ]);
    }

    public function smartCards(Request $request): JsonResponse
    {
        $cards = SmartCard::with('user:id,first_name,last_name,email')
            ->orderBy('created_at', 'desc')
            ->paginate($request->input('per_page', 20));

        return response()->json($cards);
    }

    public function connections(Request $request): JsonResponse
    {
        $connections = Connection::with('member:id,first_name,last_name,email')
            ->orderBy('created_at', 'desc')
            ->paginate($request->input('per_page', 20));

        return response()->json($connections);
    }

    public function activityLog(Request $request): JsonResponse
    {
        $logs = AdminActionLog::with('admin:id,first_name,last_name', 'targetUser:id,first_name,last_name')
            ->orderBy('created_at', 'desc')
            ->take(20)
            ->get();

        return response()->json($logs);
    }

    public function trends(): JsonResponse
    {
        $days = 30;
        $start = now()->subDays($days);

        $users = User::where('created_at', '>=', $start)
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->groupBy('date')
            ->pluck('count', 'date');

        $connections = Connection::where('created_at', '>=', $start)
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->groupBy('date')
            ->pluck('count', 'date');

        $analytics = AnalyticsEvent::where('created_at', '>=', $start)
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->groupBy('date')
            ->pluck('count', 'date');

        $dates = collect(range(0, $days - 1))->map(fn ($i) => now()->subDays($i)->format('Y-m-d'))->reverse()->values();

        $chart = fn ($data) => $dates->map(fn ($date) => [
            'label' => Carbon::parse($date)->format('M d'),
            'value' => (int) ($data[$date] ?? 0),
        ])->toArray();

        $nfcUsage = [
            ['label' => 'Assigned', 'value' => SmartCard::whereNotNull('user_id')->count()],
            ['label' => 'Unassigned', 'value' => SmartCard::whereNull('user_id')->count()],
        ];

        return response()->json([
            'usersGrowth' => $chart($users->toArray()),
            'connectionsGrowth' => $chart($connections->toArray()),
            'nfcUsage' => $nfcUsage,
            'profileViewTrends' => $chart($analytics->toArray()),
        ]);
    }
}
