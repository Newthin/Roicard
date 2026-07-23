<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdminActionLog;
use App\Models\AnalyticsEvent;
use App\Models\Payment;
use App\Models\SmartCard;
use App\Models\User;
use App\Notifications\SmartCardDeliveredNotification;
use App\Notifications\SmartCardShippedNotification;
use App\Traits\LogsAdminActions;
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
}
