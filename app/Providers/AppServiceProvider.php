<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
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
            return Limit::perMinute(5)->by($request->input('email') . '|' . $request->ip());
        });

        RateLimiter::for('register', function (Request $request) {
            return Limit::perMinute(3)->by($request->ip());
        });

        RateLimiter::for('forgot-password', function (Request $request) {
            return Limit::perMinute(3)->by($request->ip());
        });

        RateLimiter::for('payment-initiate', function (Request $request) {
            return Limit::perMinute(5)->by(auth()->id() ?? $request->ip());
        });

        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(100)->by(auth()->id() ?? $request->ip());
        });
    }
}
