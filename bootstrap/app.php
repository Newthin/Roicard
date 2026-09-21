<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withProviders([
        \App\Providers\AppServiceProvider::class,
        \App\Providers\EventServiceProvider::class,
    ])
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->prepend(\Illuminate\Http\Middleware\HandleCors::class);
        $middleware->append(\App\Http\Middleware\BustPageCache::class);

        // Requests reach PHP through an nginx reverse proxy (and may later sit
        // behind Cloudflare). Trusting those proxies lets rate limiting key on
        // the real client IP via X-Forwarded-For instead of nginx's loopback
        // address — otherwise every visitor shares one throttle bucket.
        $middleware->trustProxies(
            at: explode(',', env('TRUSTED_PROXIES', '127.0.0.1,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16')),
            headers: \Illuminate\Http\Request::HEADER_X_FORWARDED_FOR
                | \Illuminate\Http\Request::HEADER_X_FORWARDED_HOST
                | \Illuminate\Http\Request::HEADER_X_FORWARDED_PORT
                | \Illuminate\Http\Request::HEADER_X_FORWARDED_PROTO,
        );

        $middleware->redirectGuestsTo(fn () => null);

        $middleware->alias([
            'is_admin' => \App\Http\Middleware\IsAdmin::class,
            'owns' => \App\Http\Middleware\EnsureResourceOwnership::class,
            'prevent_leak' => \App\Http\Middleware\PreventCrossUserLeak::class,
            'idempotency' => \App\Http\Middleware\IdempotencyMiddleware::class,
            'cache.get' => \App\Http\Middleware\PageCacheMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->shouldRenderJsonWhen(function () {
            return true;
        });

        // Rate-limited requests surface a friendly, specific message instead of
        // Laravel's generic "Too Many Attempts." — important at an event where
        // shared WiFi/NAT makes users more likely to trip a limiter.
        $exceptions->render(function (\Illuminate\Http\Exceptions\ThrottleRequestsException $e, \Illuminate\Http\Request $request) {
            return response()->json([
                'message' => 'Too many attempts. Please wait a moment and try again.',
            ], 429, $e->getHeaders());
        });
    })->create();
