<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class BustPageCache
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if ($request->isMethod('GET') || !$response->isSuccessful() || !auth()->check()) {
            return $response;
        }

        \App\Http\Middleware\PageCacheMiddleware::bust();

        return $response;
    }
}
