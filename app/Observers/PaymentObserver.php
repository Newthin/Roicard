<?php

namespace App\Observers;

use App\Jobs\ProcessActivationJob;
use App\Models\Payment;

class PaymentObserver
{
    public function updated(Payment $payment): void
    {
        if ($payment->wasChanged('status') && $payment->status === 'success') {
            ProcessActivationJob::dispatch($payment);
        }
    }
}
