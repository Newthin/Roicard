<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ConnectionRequest;
use App\Models\Connection;
use App\Models\Profile;
use App\Models\User;
use App\Notifications\ConnectionApprovedNotification;
use App\Notifications\ConnectionRequestNotification;
use App\Services\AnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConnectionController extends Controller
{
    public function __construct(
        protected AnalyticsService $analyticsService
    ) {}

    /**
     * List every connection row that involves the authenticated user — either
     * as the receiving member or as the requesting guest. Each row carries a
     * `direction` field so the client can render the other party correctly:
     * - "received": the auth user is the profile owner (member_id)
     * - "sent":     the auth user submitted the request (guest_user_id)
     *
     * After acceptance the established connection is visible from both sides,
     * and each side links through to the other party's real public profile.
     */
    public function index(): JsonResponse
    {
        $userId = auth()->id();

        $connections = Connection::where('member_id', $userId)
            ->orWhere('guest_user_id', $userId)
            ->with([
                'member:id,first_name,last_name,email',
                'member.profile:id,user_id,slug,title,organisation',
                'guestUser:id,first_name,last_name,email',
                'guestUser.profile:id,user_id,slug,title,organisation',
            ])
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        $connections->getCollection()->transform(function (Connection $connection) use ($userId) {
            $connection->direction = $connection->member_id === $userId ? 'received' : 'sent';
            return $connection;
        });

        return response()->json(['connections' => $connections]);
    }

    public function store(ConnectionRequest $request): JsonResponse
    {
        $profile = Profile::where('slug', $request->slug)->firstOrFail();
        $member = $profile->user;

        // When the requester is an authenticated member, link the connection to
        // their real account so they see it from their own dashboard too.
        $guestUserId = auth('sanctum')->check()
            ? auth('sanctum')->id()
            : User::where('email', $request->guest_email)->value('id');

        $connection = Connection::create([
            'member_id' => $member->id,
            'guest_user_id' => $guestUserId,
            'guest_name' => $request->guest_name,
            'guest_email' => $request->guest_email,
            'guest_phone' => $request->guest_phone,
            'guest_org' => $request->guest_org,
            'guest_meeting_context' => $request->guest_meeting_context,
            'guest_introduction' => $request->guest_introduction,
            'guest_intent' => $request->guest_intent,
            'status' => 'pending',
        ]);

        $member->notify(new ConnectionRequestNotification($connection));

        $this->analyticsService->record($member->id, 'connection_request', [
            'connection_id' => $connection->id,
            'from_member' => (bool) $guestUserId,
        ]);

        return response()->json([
            'connection' => $connection,
            'message' => 'Connection request sent',
        ], 201);
    }

    public function update(string $id, Request $request): JsonResponse
    {
        // Scoped to the authenticated user (member_id): a caller can only act
        // on connection records addressed to their own inbox — foreign IDs
        // resolve to 404 and member_ids from the request body are ignored.
        $connection = Connection::where('member_id', auth()->id())
            ->findOrFail($id);

        $action = $request->input('action', '');

        if ($action === 'approve') {
            $connection->approve();

            // Notify the sender that their request was accepted — this is the
            // person who submitted the request (guest), not the member who is
            // pressing approve.
            $connection->load('member:id,first_name,last_name');
            $connection->guestUser?->notify(new ConnectionApprovedNotification($connection));

            $this->analyticsService->record(auth()->id(), 'connection_accepted', [
                'connection_id' => $connection->id,
            ]);
        } elseif ($action === 'decline') {
            $connection->decline();
        } else {
            return response()->json(['message' => 'Invalid action'], 422);
        }

        return response()->json([
            'connection' => $connection,
            'message' => "Connection {$action}d successfully",
        ]);
    }
}