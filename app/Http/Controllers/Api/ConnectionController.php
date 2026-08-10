<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ConnectionRequest;
use App\Models\Connection;
use App\Models\Profile;
use App\Models\User;
use App\Notifications\ConnectionApprovedNotification;
use App\Notifications\ConnectionRequestNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConnectionController extends Controller
{
    public function index(): JsonResponse
    {
        $connections = Connection::where('member_id', auth()->id())
            ->with('guestUser:id,first_name,last_name,email', 'guestUser.profile:id,user_id,slug')
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json(['connections' => $connections]);
    }

    public function store(ConnectionRequest $request): JsonResponse
    {
        $profile = Profile::where('slug', $request->slug)->firstOrFail();
        $member = $profile->user;

        $guestUserId = User::where('email', $request->guest_email)
            ->value('id');

        $connection = Connection::create([
            'member_id' => $member->id,
            'guest_user_id' => $guestUserId,
            'guest_name' => $request->guest_name,
            'guest_email' => $request->guest_email,
            'guest_phone' => $request->guest_phone,
            'guest_org' => $request->guest_org,
            'guest_meeting_context' => $request->guest_meeting_context,
            'status' => 'pending',
        ]);

        $member->notify(new ConnectionRequestNotification($connection));

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
            $connection->member->notify(new ConnectionApprovedNotification($connection));
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
