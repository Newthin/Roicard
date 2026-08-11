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
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
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

        // Bust public profile cache when status changes (affects draft privacy)
        $user->profile?->bustPublicCache();

        $this->logAdminAction('update_user', $user->id);

        $changes = $request->only(['status', 'role']);
        return response()->json([
            'user' => $user->fresh(),
            'message' => 'User updated',
            'changes' => $changes,
        ]);
    }

    public function storeUser(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users')],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'status' => ['required', Rule::in(['draft', 'active'])],
            'role' => ['required', Rule::in(['member', 'admin'])],
        ]);

        $user = User::create([
            'first_name' => $validated['first_name'],
            'last_name' => $validated['last_name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'status' => $validated['status'],
            'role' => $validated['role'],
        ]);

        // Create an empty profile for the user
        $user->profile()->create([]);

        // Link any prior guest connection requests to this account
        Connection::linkGuestRequestsToUser($user);

        // Assign Spatie role
        $user->assignRole($validated['role']);

        $this->logAdminAction('create_user', $user->id);

        return response()->json([
            'user' => $user->only(['id', 'first_name', 'last_name', 'email', 'status', 'role', 'created_at']),
            'message' => 'User created successfully',
        ], 201);
    }

    public function dispatchCard(string $id): JsonResponse
    {
        $smartCard = SmartCard::findOrFail($id);

        if (!in_array($smartCard->inventory_status, [SmartCard::STATUS_ASSIGNED, SmartCard::STATUS_ACTIVE])) {
            return response()->json(['message' => 'Card must be assigned to a member before dispatch'], 400);
        }

        if (!in_array($smartCard->status, ['in_production', 'pending'])) {
            return response()->json(['message' => 'Card cannot be dispatched from current status'], 400);
        }

        $smartCard->update([
            'status' => 'shipped',
            'dispatched_at' => now(),
        ]);

        $smartCard->user?->notify(new SmartCardShippedNotification($smartCard));
        $this->logAdminAction('dispatch_card', $smartCard->user_id);

        return response()->json([
            'smart_card' => $smartCard->fresh(),
            'message' => 'Card marked as shipped',
        ]);
    }

    /** Register a physical Roicard into inventory with an "available" status. */
    public function registerCard(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'card_id' => ['nullable', 'string', 'max:255', Rule::unique('smart_cards', 'card_id')],
        ]);

        $smartCard = SmartCard::create([
            'card_id' => $validated['card_id'] ?? SmartCard::generateCardId(),
            'inventory_status' => SmartCard::STATUS_AVAILABLE,
        ]);

        $this->logAdminAction('register_card', $smartCard->user_id);

        return response()->json([
            'smart_card' => $smartCard->fresh(),
            'message' => "Card {$smartCard->card_id} registered and available",
        ], 201);
    }

    public function assignCard(string $id, Request $request): JsonResponse
    {
        $request->validate(['user_id' => ['required', 'integer', 'exists:users,id']]);

        $smartCard = SmartCard::findOrFail($id);

        if ($smartCard->inventory_status === SmartCard::STATUS_ACTIVE) {
            return response()->json(['message' => 'Active card cannot be reassigned'], 400);
        }

        // A member holds at most one card (mirrors the hasOne relation and the
        // member-side storeDelivery guard). Releasing any previous holder first.
        SmartCard::where('user_id', $request->user_id)
            ->where('id', '!=', $smartCard->id)
            ->update([
                'user_id' => null,
                'inventory_status' => SmartCard::STATUS_AVAILABLE,
            ]);

        $smartCard->update([
            'user_id' => $request->user_id,
            'inventory_status' => SmartCard::STATUS_ASSIGNED,
            'assigned_at' => now(),
        ]);

        $this->logAdminAction('assign_card', $request->user_id);

        return response()->json([
            'smart_card' => $smartCard->fresh()->load('user:id,first_name,last_name,email'),
            'message' => 'Card assigned to user',
        ]);
    }

    public function unassignCard(string $id): JsonResponse
    {
        $smartCard = SmartCard::findOrFail($id);

        if ($smartCard->inventory_status === SmartCard::STATUS_ACTIVE) {
            return response()->json(['message' => 'Active card must be deactivated before unassigning'], 400);
        }

        $smartCard->update([
            'user_id' => null,
            'inventory_status' => SmartCard::STATUS_AVAILABLE,
            'assigned_at' => null,
        ]);

        $this->logAdminAction('unassign_card');

        return response()->json([
            'smart_card' => $smartCard->fresh(),
            'message' => 'Card unassigned',
        ]);
    }

    /** Mark an assigned card as active (linked and in use with its holder). */
    public function activateCard(string $id): JsonResponse
    {
        $smartCard = SmartCard::findOrFail($id);

        if ($smartCard->inventory_status !== SmartCard::STATUS_ASSIGNED || !$smartCard->user_id) {
            return response()->json(['message' => 'Only an assigned card can be activated'], 400);
        }

        $smartCard->update(['inventory_status' => SmartCard::STATUS_ACTIVE]);

        $this->logAdminAction('activate_card', $smartCard->user_id);

        return response()->json([
            'smart_card' => $smartCard->fresh()->load('user:id,first_name,last_name,email'),
            'message' => 'Card activated',
        ]);
    }

    /** Deactivate a card (removed from circulation, holder retained on record). */
    public function deactivateCard(string $id): JsonResponse
    {
        $smartCard = SmartCard::findOrFail($id);

        if (!in_array($smartCard->inventory_status, [SmartCard::STATUS_ASSIGNED, SmartCard::STATUS_ACTIVE])) {
            return response()->json(['message' => 'Card is not assigned or active'], 400);
        }

        $smartCard->update(['inventory_status' => SmartCard::STATUS_DEACTIVATED]);

        $this->logAdminAction('deactivate_card', $smartCard->user_id);

        return response()->json([
            'smart_card' => $smartCard->fresh()->load('user:id,first_name,last_name,email'),
            'message' => 'Card deactivated',
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

        $smartCard->user?->notify(new SmartCardDeliveredNotification($smartCard));
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

    public function trends(Request $request): JsonResponse
    {
        $period = $request->input('period', '30d');
        $days = match ($period) {
            '7d' => 7,
            '90d' => 90,
            'all' => null,
            default => 30,
        };
        $start = $days ? now()->subDays($days) : now()->subYears(10);

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

        $windowDays = $days ?? 30;
        $dates = collect(range(0, $windowDays - 1))->map(fn ($i) => now()->subDays($i)->format('Y-m-d'))->reverse()->values();

        $chart = fn ($data) => $dates->map(fn ($date) => [
            'label' => Carbon::parse($date)->format('M d'),
            'value' => (int) ($data[$date] ?? 0),
        ])->toArray();

        $nfcUsage = [
            ['label' => 'Active', 'value' => SmartCard::where('inventory_status', SmartCard::STATUS_ACTIVE)->count()],
            ['label' => 'Assigned', 'value' => SmartCard::where('inventory_status', SmartCard::STATUS_ASSIGNED)->count()],
            ['label' => 'Available', 'value' => SmartCard::where('inventory_status', SmartCard::STATUS_AVAILABLE)->count()],
        ];

        return response()->json([
            'usersGrowth' => $chart($users->toArray()),
            'connectionsGrowth' => $chart($connections->toArray()),
            'nfcUsage' => $nfcUsage,
            'profileViewTrends' => $chart($analytics->toArray()),
        ]);
    }
}
