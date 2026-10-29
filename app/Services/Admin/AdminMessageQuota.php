<?php

namespace App\Services\Admin;

use App\Models\AdminMessageRecipient;

/**
 * Approximate Resend Free-plan budget for manual admin messages.
 *
 * Resend counts every app email (welcome, draft reminders, meeting mail), so
 * this only reserves the portion the console can see. The limits themselves
 * come from config and must never be raised to send faster.
 */
class AdminMessageQuota
{
    public function snapshot(): array
    {
        $dailyLimit = max(0, (int) config('mail.admin.daily_quota', 100));
        $monthlyLimit = max(0, (int) config('mail.admin.monthly_quota', 3000));

        $dayStart = now()->utc()->startOfDay();
        $monthStart = now()->utc()->startOfMonth();

        // Queued/sending rows reserve budget too, so two large sends in the
        // same minute cannot both pass the check.
        $committedToday = AdminMessageRecipient::query()
            ->whereIn('status', [
                AdminMessageRecipient::STATUS_QUEUED,
                AdminMessageRecipient::STATUS_SENDING,
                AdminMessageRecipient::STATUS_SENT,
            ])
            ->where('created_at', '>=', $dayStart)
            ->count();

        $committedMonth = AdminMessageRecipient::query()
            ->whereIn('status', [
                AdminMessageRecipient::STATUS_QUEUED,
                AdminMessageRecipient::STATUS_SENDING,
                AdminMessageRecipient::STATUS_SENT,
            ])
            ->where('created_at', '>=', $monthStart)
            ->count();

        return [
            'daily_limit' => $dailyLimit,
            'monthly_limit' => $monthlyLimit,
            'committed_today' => $committedToday,
            'committed_month' => $committedMonth,
            'daily_remaining' => max(0, $dailyLimit - $committedToday),
            'monthly_remaining' => max(0, $monthlyLimit - $committedMonth),
            'tracked_only' => true,
        ];
    }

    /**
     * @return array<int, string>
     */
    public function errorsFor(int $recipientCount): array
    {
        $quota = $this->snapshot();
        $errors = [];

        if ($recipientCount > $quota['daily_remaining']) {
            $errors[] = sprintf(
                'This send needs %d emails but only %d of the Resend daily budget remain '
                . '(%d/day on the Free plan). Reduce the audience or wait for the next UTC day.',
                $recipientCount,
                $quota['daily_remaining'],
                $quota['daily_limit'],
            );
        }

        if ($recipientCount > $quota['monthly_remaining']) {
            $errors[] = sprintf(
                'This send needs %d emails but only %d remain in the tracked monthly budget.',
                $recipientCount,
                $quota['monthly_remaining'],
            );
        }

        return $errors;
    }
}
