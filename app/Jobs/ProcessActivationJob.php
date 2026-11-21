<?php

namespace App\Jobs;

use App\Models\Payment;
use App\Services\Billing\SubscriptionService;
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
     * A verified payment is applied to the member's subscription exactly once.
     *
     * Legacy payments (created before plans existed, or by an older client)
     * carry no plan/period; SubscriptionService converts those into the
     * non-expiring founding plan. Either way the audit trail and the
     * membership side effects stay in one place.
     */
    public function handle(SubscriptionService $subscriptions): void
    {
        $subscriptions->applyPaidPayment($this->payment);
    }
}
