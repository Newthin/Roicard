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
        $days = match ($period) {
            '7d' => 7,
            '90d' => 90,
            default => 30,
        };
        $query->where('created_at', '>=', now()->subDays($days));

        $events = $query->get();

        $profileViews = $events->where('type', 'profile_view');
        $qrScans = $events->where('type', 'qr_scan');
        $connectionRequests = $events->where('type', 'connection_request');

        $daily = collect(range(0, $days - 1))->mapWithKeys(fn ($i) => [
            now()->subDays($i)->format('Y-m-d') => ['profile_views' => 0, 'qr_scans' => 0, 'connection_requests' => 0],
        ]);

        foreach ($events as $e) {
            $date = $e->created_at->format('Y-m-d');
            $metric = $e->type === 'profile_view' ? 'profile_views'
                : ($e->type === 'qr_scan' ? 'qr_scans'
                : ($e->type === 'connection_request' ? 'connection_requests' : null));
            if ($metric && $daily->has($date)) {
                $daily[$date][$metric]++;
            }
        }

        $chart = fn ($key) => $daily->map(fn ($v, $date) => [
            'date' => $date,
            'label' => \Carbon\Carbon::parse($date)->format('M d'),
            'value' => $v[$key],
        ])->values()->toArray();

        return [
            'total_views' => $profileViews->count() + $events->whereIn('type', ['card_tap'])->count(),
            'profile_views' => $profileViews->count(),
            'card_taps' => $events->where('type', 'card_tap')->count(),
            'qr_scans' => $qrScans->count(),
            'connection_requests' => $connectionRequests->count(),
            'contact_saves' => $events->where('type', 'contact_save')->count(),
            'whatsapp_taps' => $events->where('type', 'whatsapp_tap')->count(),
            'total' => $events->count(),
            'period' => $period,
            'metrics' => [
                ['key' => 'profile_views', 'label' => 'Profile Views', 'value' => $profileViews->count(), 'changePercent' => 0, 'trend' => 'neutral'],
                ['key' => 'qr_scans', 'label' => 'QR Scans', 'value' => $qrScans->count(), 'changePercent' => 0, 'trend' => 'neutral'],
                ['key' => 'nfc_taps', 'label' => 'NFC Taps', 'value' => $events->where('type', 'card_tap')->count(), 'changePercent' => 0, 'trend' => 'neutral'],
                ['key' => 'connection_requests', 'label' => 'Connection Requests', 'value' => $connectionRequests->count(), 'changePercent' => 0, 'trend' => 'neutral'],
                ['key' => 'total_connections', 'label' => 'Total Connections', 'value' => $connectionRequests->count(), 'changePercent' => 0, 'trend' => 'neutral'],
            ],
            'overview' => [
                'totalReach' => $events->count(),
                'engagementSummary' => $events->count() > 0 ? 'Active' : 'No activity yet',
                'mostActivePeriod' => $events->count() > 0 ? 'Last ' . $days . ' days' : 'N/A',
            ],
            'profileViewsChart' => $chart('profile_views'),
            'qrScansChart' => $chart('qr_scans'),
            'connectionRequestsChart' => $chart('connection_requests'),
            'activities' => $events->sortByDesc('created_at')->take(20)->map(fn ($e) => [
                'id' => (string) $e->id,
                'type' => $e->type === 'profile_view' ? 'profile_view'
                    : ($e->type === 'qr_scan' ? 'qr_scan'
                    : ($e->type === 'card_tap' ? 'nfc_tap'
                    : ($e->type === 'connection_request' ? 'connection_request' : 'profile_view'))),
                'timestamp' => $e->created_at->toIso8601String(),
                'description' => match ($e->type) {
                    'profile_view' => 'Someone viewed your profile',
                    'qr_scan' => 'Your QR code was scanned',
                    'card_tap' => 'Your NFC card was tapped',
                    'connection_request' => 'New connection request received',
                    'contact_save' => 'Someone saved your contact',
                    'whatsapp_tap' => 'Someone tapped your WhatsApp link',
                    default => 'Activity recorded',
                },
            ])->values()->toArray(),
            'hasData' => $events->count() > 0,
        ];
    }
}
