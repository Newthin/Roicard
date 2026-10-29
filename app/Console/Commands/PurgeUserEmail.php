<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * Permanently remove a soft-deleted account so its email can sign up again.
 *
 * This bypasses the retention window and is irreversible. Only soft-deleted
 * rows can be purged; active accounts are refused.
 *
 * Usage: php artisan users:purge-email someone@example.com --force
 */
class PurgeUserEmail extends Command
{
    protected $signature = 'users:purge-email
                            {email : Email address of the deleted account}
                            {--force : Permanently delete without confirmation}';

    protected $description = 'Permanently delete a soft-deleted account so its email can be reused';

    public function handle(): int
    {
        $email = trim((string) $this->argument('email'));

        $active = User::whereRaw('LOWER(email) = ?', [mb_strtolower($email)])->exists();
        if ($active) {
            $this->error("{$email} belongs to an active account. Refusing to purge.");

            return self::FAILURE;
        }

        $users = User::onlyTrashed()
            ->whereRaw('LOWER(email) = ?', [mb_strtolower($email)])
            ->orderBy('id')
            ->get();

        if ($users->isEmpty()) {
            $this->warn("No deleted account found for {$email}.");

            return self::SUCCESS;
        }

        if (!$this->option('force') && !$this->confirm(
            "Permanently delete {$users->count()} account(s) for {$email}? This cannot be undone.",
            false
        )) {
            $this->info('Cancelled.');

            return self::SUCCESS;
        }

        foreach ($users as $user) {
            $userId = $user->getKey();

            // Tokens are polymorphic, so they are not removed by the FK cascade.
            $user->tokens()->delete();
            $user->forceDelete();

            Log::warning('User account purged by email', [
                'user_id' => $userId,
                'email' => $email,
                'purged_by' => 'artisan users:purge-email',
            ]);

            $this->line("Purged user {$userId} ({$email}).");
        }

        $this->info('Done. The email can now be used for a new signup.');

        return self::SUCCESS;
    }
}
