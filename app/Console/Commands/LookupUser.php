<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

/**
 * Inspect an email address across active and soft-deleted accounts.
 *
 * Read-only. Useful when OAuth signup reports `account_deleted`: it shows the
 * retained row (id, status, role, when it was deleted) without exposing any
 * password or token data.
 *
 * Usage: php artisan users:lookup someone@example.com
 */
class LookupUser extends Command
{
    protected $signature = 'users:lookup {email : Email address to inspect}';

    protected $description = 'Show active and soft-deleted accounts for an email address';

    public function handle(): int
    {
        $email = trim((string) $this->argument('email'));

        $users = User::withTrashed()
            ->whereRaw('LOWER(email) = ?', [mb_strtolower($email)])
            ->orderBy('id')
            ->get();

        if ($users->isEmpty()) {
            $this->warn("No account (active or deleted) found for {$email}.");

            return self::SUCCESS;
        }

        $this->table(
            ['ID', 'Email', 'Status', 'Role', 'Onboarded', 'Deleted at', 'Created at'],
            $users->map(fn (User $user) => [
                $user->getKey(),
                $user->email,
                $user->status,
                $user->role,
                $user->onboarding_completed_at?->toDateTimeString() ?? '—',
                $user->deleted_at?->toDateTimeString() ?? '— (active)',
                $user->created_at?->toDateTimeString() ?? '—',
            ])->all()
        );

        return self::SUCCESS;
    }
}
