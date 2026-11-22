<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Gate an authenticated member route on a feature from their current plan.
 *
 * Plan features are derived from the active subscription (never from the
 * account status column), so an expired or cancelled plan loses access at
 * once while still keeping its data.
 */
class RequiresFeature
{
    public function handle(Request $request, Closure $next, string $feature): Response
    {
        $user = $request->user();

        if (! $user || ! $user->hasFeature($feature)) {
            return response()->json([
                'message' => 'This feature is not available on your plan.',
                'feature' => $feature,
            ], 403);
        }

        return $next($request);
    }
}
