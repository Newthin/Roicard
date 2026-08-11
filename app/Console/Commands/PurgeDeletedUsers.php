<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

/**
 * Permanently removes accounts that were soft-deleted longer ago than the
 * configured data retention window. After this runs, the user row and its
 * cascade-owned data (profile, payments, analytics, connections where the
 * user is the member) are gone forever.
 *
 * Run manually:  php artisan users:purge
 * Scheduled:    daily via routes/console.php (needs `schedule:run` cron).
 */
class PurgeDeletedUsers extends Command
{
    protected $signature = 'users:purge {--days= : Override DATA_RETENTION_DAYS}';

    protected $description = 'Permanently delete user accounts past the data retention window';

    public function handle(): int
    {
        $days = (int) ($this->option('days') ?: config('app.data_retention_days', 30));
        $cutoff = now()->subDays($days);

        $users = User::onlyTrashed()
            ->where('deleted_at', '<=', $cutoff)
            ->get();

        if ($users->isEmpty()) {
            $this->info('No accounts past the retention window.');

            return self::SUCCESS;
        }

        foreach ($users as $user) {
            // Tokens are a morph, not an FK, so they must be removed explicitly.
            $user->tokens()->delete();
            $user->forceDelete();
            $this->line("Purged user {$user->getKey()}");
        }

        $this->info("Purged {$users->count()} account(s) older than {$days} days.");

        return self::SUCCESS;
    }
}
