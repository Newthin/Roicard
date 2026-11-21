<?php

namespace App\Console\Commands;

use App\Services\Billing\PlanInstaller;
use Illuminate\Console\Command;

/**
 * Idempotent maintenance entry point for deployments where the migration has
 * already run but the plan catalogue or founding backfill needs re-applying.
 */
class BillingBackfill extends Command
{
    protected $signature = 'billing:backfill {--skip-plans : Do not re-seed the plan catalogue}';

    protected $description = 'Seed the plan catalogue and grant founding access to legacy one-time payers';

    public function handle(PlanInstaller $installer): int
    {
        if (!$this->option('skip-plans')) {
            $installer->seedPlans();
            $this->info('Plan catalogue seeded.');
        }

        $result = $installer->backfillFoundingMembers();

        $this->info("Founding access granted to {$result['granted']} member(s); {$result['skipped']} already had a subscription.");

        return self::SUCCESS;
    }
}
