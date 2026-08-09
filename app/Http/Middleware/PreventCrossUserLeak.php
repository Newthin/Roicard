<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * Defense-in-depth against cross-account data leaks on authenticated routes.
 *
 * After the response is generated we verify that any top-level `user` or
 * `profile` object belongs to the authenticated user. If a mismatch is found
 * the response is replaced with a 500 and a critical security alert is logged.
 *
 * Notes:
 * - Only GET/HEAD responses are inspected because the page cache (the original
 *   leak vector) only ever stores and replays GET/HEAD responses; mutation
 *   responses (e.g. admin creating a user) legitimately echo other entities.
 * - `profile.id` is the profile's own primary key, not the user id, so profile
 *   ownership is checked against its `user_id` column instead.
 */
class PreventCrossUserLeak
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if (!$request->isMethod('GET') && !$request->isMethod('HEAD')) {
            return $response;
        }

        $user = $request->user();
        if (!$user) {
            return $response;
        }

        // Only inspect JSON bodies.
        if (!str_contains($response->headers->get('Content-Type') ?? '', 'application/json')) {
            return $response;
        }

        $payload = json_decode($response->getContent(), true);
        if (!is_array($payload)) {
            return $response;
        }

        $ownId = (string) $user->getKey();

        if (isset($payload['user']) && is_array($payload['user'])) {
            $leakedId = $this->checkUserIdentity($payload['user'], $ownId);
            if ($leakedId !== null) {
                return $this->block($request, $ownId, $leakedId);
            }
        }

        if (isset($payload['profile']) && is_array($payload['profile'])) {
            $leakedId = $this->checkProfileIdentity($payload['profile'], $ownId);
            if ($leakedId !== null) {
                return $this->block($request, $ownId, $leakedId);
            }
        }

        return $response;
    }

    /** A top-level `user` object must carry the authenticated user's id. */
    protected function checkUserIdentity(array $object, string $ownId): ?string
    {
        if (array_key_exists('id', $object) && $object['id'] !== null) {
            return (string) $object['id'] === $ownId ? null : (string) $object['id'];
        }

        if (array_key_exists('user_id', $object) && $object['user_id'] !== null) {
            return (string) $object['user_id'] === $ownId ? null : (string) $object['user_id'];
        }

        return null;
    }

    /** A top-level `profile` object must belong to the authenticated user. */
    protected function checkProfileIdentity(array $object, string $ownId): ?string
    {
        if (array_key_exists('user_id', $object) && $object['user_id'] !== null) {
            return (string) $object['user_id'] === $ownId ? null : (string) $object['user_id'];
        }

        return null;
    }

    protected function block(Request $request, string $ownId, string $leakedId): Response
    {
        Log::critical('CROSS-USER DATA LEAK BLOCKED', [
            'authenticated_user_id' => $ownId,
            'leaked_user_id' => $leakedId,
            'path' => $request->path(),
            'method' => $request->method(),
            'ip' => $request->ip(),
            'url' => $request->fullUrl(),
        ]);

        return response()->json([
            'message' => 'Security violation detected',
        ], 500);
    }
}