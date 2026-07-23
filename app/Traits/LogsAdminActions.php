<?php

namespace App\Traits;

use App\Models\AdminActionLog;

trait LogsAdminActions
{
    protected function logAdminAction(string $action, ?int $targetUserId = null): void
    {
        AdminActionLog::create([
            'admin_id' => auth()->id(),
            'action' => $action,
            'target_user_id' => $targetUserId,
        ]);
    }
}
