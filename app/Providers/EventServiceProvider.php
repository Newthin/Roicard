<?php

namespace App\Providers;

use App\Models\Payment;
use App\Models\Profile;
use App\Models\SmartCard;
use App\Models\User;
use App\Observers\PaymentObserver;
use App\Observers\ProfileObserver;
use App\Observers\SmartCardObserver;
use App\Observers\UserObserver;
use Illuminate\Auth\Events\Registered;
use Illuminate\Auth\Listeners\SendEmailVerificationNotification;
use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;

class EventServiceProvider extends ServiceProvider
{
    protected $listen = [
        Registered::class => [
            SendEmailVerificationNotification::class,
        ],
    ];

    public function boot(): void
    {
        User::observe(UserObserver::class);
        Profile::observe(ProfileObserver::class);
        Payment::observe(PaymentObserver::class);
        SmartCard::observe(SmartCardObserver::class);
    }
}
