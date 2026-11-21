<?php

namespace App\Console\Commands;

use App\Services\Growth\PayoutService;
use Illuminate\Console\Command;

class GeneratePayoutBatches extends Command
{
    protected $signature = 'payouts:generate-batches {--force : Ignore the cadence window and generate now}';

    protected $description = 'Batch eligible cleared commissions for Executive payouts';

    public function handle(PayoutService $payouts): int
    {
        $batches = $payouts->generateBatches((bool) $this->option('force'));
        $total = $batches->sum(fn ($batch) => (float) $batch->total_amount);

        $this->info(sprintf(
            'Generated %d payout batch(es) totalling %s %s.',
            $batches->count(),
            config('roicard.billing.currency', 'GHS'),
            number_format((float) $total, 2)
        ));

        return self::SUCCESS;
    }
}
