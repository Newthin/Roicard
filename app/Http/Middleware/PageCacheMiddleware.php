<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class PageCacheMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->isMethod('GET') && !$request->isMethod('HEAD')) {
            return $next($request);
        }

        $prefix = $this->prefix($request);
        $cacheKey = $prefix . ':page:' . md5($request->fullUrl());

        $cached = $this->store()->get($cacheKey);
        if ($cached !== null && is_array($cached)) {
            return response()->json($cached['data'], $cached['status']);
        }

        $response = $next($request);

        if ($response->isSuccessful()) {
            $this->store()->put($cacheKey, [
                'data' => json_decode($response->getContent(), true),
                'status' => $response->getStatusCode(),
            ], 30);
        }

        return $response;
    }

    public static function bust(): void
    {
        $id = auth()->id();
        if ($id) {
            Cache::increment('page_cache_ver:user:' . $id);
        }
    }

    private function store()
    {
        return Cache::store();
    }

    private function prefix(Request $request): string
    {
        $id = auth()->check() ? 'user:' . auth()->id() : 'guest:' . $request->ip();
        $ver = Cache::get('page_cache_ver:' . $id, 0);
        return 'pg:' . $id . ':v' . $ver;
    }
}
