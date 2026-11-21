<?php

namespace App\Console\Commands;

use App\Services\Billing\SubscriptionService;
use Illuminate\Console\Command;

class BillingSyncLifecycle extends Command
{
    protected $signature = 'billing:sync-lifecycle';

    protected $description = 'Move ended subscriptions into grace and expire anything past the grace window';

    public function handle(SubscriptionService $subscriptions): int
    {
        $counts = $subscriptions->syncLifecycle();

        $this->info("Moved {$counts['grace']} subscription(s) to grace; expired {$counts['expired']}.");

        return self::SUCCESS;
    }
}
