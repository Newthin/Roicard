<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * Restore a soft-deleted account so the owner can sign in again.
 *
 * Soft-deleted accounts are retained for the data-retention window and their
 * email cannot be reused for a new signup during that time. Restoring brings
 * the original profile, payments and onboarding state back.
 *
 * Usage: php artisan users:restore someone@example.com
 */
class RestoreUser extends Command
{
    protected $signature = 'users:restore
                            {email : Email address of the deleted account}
                            {--force : Skip the confirmation prompt}';

    protected $description = 'Restore a soft-deleted account by email address';

    public function handle(): int
    {
        $email = trim((string) $this->argument('email'));

        $users = User::onlyTrashed()
            ->whereRaw('LOWER(email) = ?', [mb_strtolower($email)])
            ->orderBy('id')
            ->get();

        if ($users->isEmpty()) {
            $this->warn("No deleted account found for {$email}. Run users:lookup to inspect it.");

            return self::SUCCESS;
        }

        if (!$this->option('force') && !$this->confirm(
            "Restore {$users->count()} account(s) for {$email}?",
            true
        )) {
            $this->info('Cancelled.');

            return self::SUCCESS;
        }

        foreach ($users as $user) {
            $user->restore();

            Log::info('User account restored', [
                'user_id' => $user->getKey(),
                'email' => $user->email,
                'restored_by' => 'artisan users:restore',
            ]);

            $this->line("Restored user {$user->getKey()} ({$user->email}).");
        }

        $this->info('Done. The owner can sign in with the provider or request a password reset.');

        return self::SUCCESS;
    }
}
