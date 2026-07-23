<?php

namespace App\Services;

use App\Models\AnalyticsEvent;

class AnalyticsService
{
    public function record(int $memberId, string $type, ?array $metadata = null): void
    {
        AnalyticsEvent::create([
            'member_id' => $memberId,
            'type' => $type,
            'metadata' => $metadata,
        ]);
    }

    public function summary(int $memberId, ?string $period = '30d'): array
    {
        $query = AnalyticsEvent::where('member_id', $memberId);

        if ($period === '7d') {
            $query->where('created_at', '>=', now()->subDays(7));
        } elseif ($period === '30d') {
            $query->where('created_at', '>=', now()->subDays(30));
        } elseif ($period === '90d') {
            $query->where('created_at', '>=', now()->subDays(90));
        }

        $events = $query->get();

        return [
            'total_views' => $events->whereIn('type', ['profile_view', 'card_tap', 'qr_scan'])->count(),
            'profile_views' => $events->where('type', 'profile_view')->count(),
            'card_taps' => $events->where('type', 'card_tap')->count(),
            'qr_scans' => $events->where('type', 'qr_scan')->count(),
            'connection_requests' => $events->where('type', 'connection_request')->count(),
            'contact_saves' => $events->where('type', 'contact_save')->count(),
            'whatsapp_taps' => $events->where('type', 'whatsapp_tap')->count(),
            'total' => $events->count(),
            'period' => $period,
        ];
    }
}
