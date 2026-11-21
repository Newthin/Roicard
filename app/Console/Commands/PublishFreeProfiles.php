<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\MemberAccountService;
use Illuminate\Console\Command;

/**
 * Publishes free-tier profiles for members who completed onboarding before
 * the free plan existed. Paid members were already published at activation.
 *
 * Idempotent and safe to re-run at launch.
 */
class PublishFreeProfiles extends Command
{
    protected $signature = 'billing:publish-free-profiles {--dry-run : Count without writing}';

    protected $description = 'Publish public profiles for completed onboarding members on the free plan';

    public function handle(MemberAccountService $accounts): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $published = 0;

        User::query()
            ->whereNotNull('onboarding_completed_at')
            ->whereNull('deactivated_at')
            ->where('role', 'member')
            ->whereNull('deleted_at')
            ->with('profile')
            ->chunkById(200, function ($users) use ($accounts, $dryRun, &$published) {
                foreach ($users as $user) {
                    if (!$user->profile || $user->profile->is_live) {
                        continue;
                    }

                    if (!$dryRun) {
                        $accounts->publishProfile($user);
                    }

                    $published++;
                }
            });

        $this->info(($dryRun ? 'Would publish ' : 'Published ') . "{$published} free profile(s).");

        return self::SUCCESS;
    }
}
