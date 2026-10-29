<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\View;
use Illuminate\Support\ServiceProvider;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Contracts\Factory;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
    }

    public function boot(): void
    {
        // The `mail` view namespace is normally registered by the Markdown
        // mail renderer. The manual-message mailable renders a plain Blade
        // view (so composer text is not reinterpreted as Markdown), so
        // register the same component path here for <x-mail::message>.
        View::addNamespace('mail', resource_path('views/vendor/mail/html'));

        Socialite::extend('instagram', function ($app) {
            return $app->make(Factory::class)->buildProvider(
                \App\Socialite\InstagramProvider::class,
                config('services.instagram')
            );
        });

        ResetPassword::createUrlUsing(function ($user, string $token) {
            return rtrim(config('app.frontend_url'), '/')
                . '/auth/reset-password?token=' . $token
                . '&email=' . urlencode($user->getEmailForPasswordReset());
        });

        RateLimiter::for('login', function (Request $request) {
            $email = strtolower((string) $request->input('email'));

            // Per-account brute-force protection + a per-IP ceiling that stays
            // on the safe side of event WiFi/NAT (many users, one address).
            return [
                Limit::perMinute(10)->by($email . '|' . $request->ip()),
                Limit::perMinute(60)->by($request->ip()),
            ];
        });

        RateLimiter::for('register', function (Request $request) {
            // Registration is guarded by per-IP *and* per-email limits: 500+
            // members on shared event WiFi need headroom, but each address is
            // still capped to stop scripted bulk signups.
            return [
                Limit::perMinute(60)->by($request->ip()),
                Limit::perMinute(5)->by(strtolower((string) $request->input('email'))),
            ];
        });

        RateLimiter::for('forgot-password', function (Request $request) {
            return Limit::perMinute(10)->by($request->ip());
        });

        RateLimiter::for('payment-initiate', function (Request $request) {
            return Limit::perMinute(10)->by(auth()->id() ?? $request->ip());
        });

        RateLimiter::for('api', function (Request $request) {
            if ($request->user()) {
                return Limit::perMinute(600)->by($request->user()->id);
            }

            // Guests (public profiles, meetings, QR scans) get a higher shared
            // ceiling so browsing on congested event WiFi isn't throttled.
            return Limit::perMinute(300)->by($request->ip());
        });

        // Guest cancellation — prevent brute-force token guessing.
        // 10 requests/min per IP is generous for legitimate use.
        RateLimiter::for('guest-cancellation', function (Request $request) {
            return Limit::perMinute(10)->by($request->ip());
        });

        // Public booking endpoints — prevent scraping and abuse.
        // 30 requests/min per IP for browsing meeting types and slots.
        RateLimiter::for('public-booking', function (Request $request) {
            return Limit::perMinute(30)->by($request->ip());
        });

        // Manual admin messages: the create endpoint is expensive (audience
        // resolution + fan-out), so cap attempts per admin. Double-click
        // protection also uses the idempotency middleware.
        RateLimiter::for('admin-message-send', function (Request $request) {
            return Limit::perMinute(5)->by(auth()->id() ?? $request->ip());
        });

        RateLimiter::for('admin-message-test', function (Request $request) {
            return Limit::perMinute(10)->by(auth()->id() ?? $request->ip());
        });

        // Queue-side throttle, below Resend's 10 requests/second per team.
        RateLimiter::for('admin-mail', function () {
            return Limit::perSecond(max(1, (int) config('mail.admin.rate_per_second', 8)))
                ->by('resend-team');
        });
    }
}
