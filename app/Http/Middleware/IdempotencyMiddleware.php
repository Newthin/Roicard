<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class IdempotencyMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $key = $request->header('Idempotency-Key');

        if (!$key) {
            return response()->json(['message' => 'Idempotency-Key header is required'], 400);
        }

        $cacheKey = "idempotency:{$key}";

        if (Cache::has($cacheKey)) {
            $cached = Cache::get($cacheKey);

            if (is_array($cached) && isset($cached['__processing__'])) {
                return response()->json(['message' => 'Request is already being processed'], 409);
            }

            $headers = $cached['headers'] ?? [];
            $headers['X-Idempotent-Replayed'] = 'true';

            return response()->json($cached['data'], $cached['status'], $headers);
        }

        Cache::put($cacheKey, ['__processing__' => true], now()->addHours(24));

        $response = $next($request);

        if ($response->isSuccessful()) {
            Cache::put($cacheKey, [
                'data' => json_decode($response->getContent(), true),
                'status' => $response->getStatusCode(),
                'headers' => $response->headers->all(),
            ], now()->addHours(24));
        } else {
            Cache::forget($cacheKey);
        }

        return $response;
    }
}
