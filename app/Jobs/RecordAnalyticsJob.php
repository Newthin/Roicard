<?php

namespace App\Jobs;

use App\Models\User;
use App\Notifications\ProfileViewedNotification;
use App\Notifications\QrScannedNotification;
use App\Services\AnalyticsService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Cache;

class RecordAnalyticsJob implements ShouldQueue
{
    use Dispatchable, Queueable;

    /** One engagement email per member per event type per hour. */
    protected const NOTIFY_THROTTLE_HOURS = 1;

    public function __construct(
        public int $memberId,
        public string $type,
        public ?array $metadata = null
    ) {}

    public function handle(AnalyticsService $analytics): void
    {
        $analytics->record($this->memberId, $this->type, $this->metadata);

        $this->sendEngagementEmailIfDue();
    }

    /**
     * Email members when their profile is viewed or their QR code scanned,
     * but throttled so a burst of views/scans yields at most one email.
     */
    protected function sendEngagementEmailIfDue(): void
    {
        $notification = match ($this->type) {
            'profile_view' => new ProfileViewedNotification(),
            'qr_scan' => new QrScannedNotification(),
            default => null,
        };

        if (!$notification) {
            return;
        }

        $cacheKey = "engagement_mail:{$this->memberId}:{$this->type}";
        if (Cache::has($cacheKey)) {
            return;
        }

        Cache::put($cacheKey, true, now()->addHours(self::NOTIFY_THROTTLE_HOURS));

        /** @var User|null $user */
        $user = User::find($this->memberId);
        if (!$user) {
            return;
        }

        $user->notify($notification);
    }
}
