<?php

namespace App\Traits;

use App\Models\AdminActionLog;

trait LogsAdminActions
{
    /**
     * @param  array<string, mixed>  $metadata  Structured context (never secrets
     *                                          or message bodies).
     */
    protected function logAdminAction(string $action, ?int $targetUserId = null, array $metadata = []): void
    {
        AdminActionLog::create([
            'admin_id' => auth()->id(),
            'action' => $action,
            'target_user_id' => $targetUserId,
            'metadata' => $metadata ?: null,
        ]);
    }
}
