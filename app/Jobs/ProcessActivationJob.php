<?php

namespace App\Jobs;

use App\Models\Payment;
use App\Services\MemberAccountService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;

class ProcessActivationJob implements ShouldQueue
{
    use Dispatchable, Queueable;

    public function __construct(
        public Payment $payment
    ) {}

    /**
     * A verified payment flips the membership to active and publishes the
     * public profile through the shared account service, so the payment path
     * and the admin activation path apply identical side effects.
     */
    public function handle(MemberAccountService $accounts): void
    {
        $accounts->activateMembership($this->payment->user);
    }
}
