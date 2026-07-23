<?php

namespace App\Jobs;

use App\Services\AnalyticsService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;

class RecordAnalyticsJob implements ShouldQueue
{
    use Dispatchable, Queueable;

    public function __construct(
        public int $memberId,
        public string $type,
        public ?array $metadata = null
    ) {}

    public function handle(AnalyticsService $analytics): void
    {
        $analytics->record($this->memberId, $this->type, $this->metadata);
    }
}
