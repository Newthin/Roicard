<?php

namespace App\Observers;

use App\Jobs\ProcessActivationJob;
use App\Models\Payment;

class PaymentObserver
{
    public function updated(Payment $payment): void
    {
        if ($payment->wasChanged('status') && $payment->status === 'success') {
            // Run synchronously so activation doesn't depend on a queue worker.
            ProcessActivationJob::dispatchSync($payment);
        }
    }
}
