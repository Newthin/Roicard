<?php

namespace App\Services;

use App\Models\AnalyticsEvent;
use App\Models\Connection;

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
        $days = match ($period) {
            '7d' => 7,
            '90d' => 90,
            'all' => null,
            default => 30,
        };

        $query = AnalyticsEvent::where('member_id', $memberId);
        $events = $query->get();
        $inWindow = $events->filter(fn ($e) => $days === null || $e->created_at->gte(now()->subDays($days)));
        $events = $inWindow;

        $profileViews = $events->where('type', 'profile_view');
        $qrScans = $events->where('type', 'qr_scan');
        $connectionRequests = $events->where('type', 'connection_request');
        $connectionAccepted = $events->where('type', 'connection_accepted');

        $chartDays = $days ?? 30;
        $daily = collect(range(0, $chartDays - 1))->mapWithKeys(fn ($i) => [
            now()->subDays($i)->format('Y-m-d') => ['profile_views' => 0, 'qr_scans' => 0, 'connection_requests' => 0],
        ]);

        foreach ($events as $e) {
            $date = $e->created_at->format('Y-m-d');
            $metric = $e->type === 'profile_view' ? 'profile_views'
                : ($e->type === 'qr_scan' ? 'qr_scans'
                : ($e->type === 'connection_request' ? 'connection_requests' : null));
            if ($metric && $daily->has($date)) {
                $entry = $daily->get($date);
                $entry[$metric]++;
                $daily->put($date, $entry);
            }
        }

        $chart = fn ($key) => $daily->map(fn ($v, $date) => [
            'date' => $date,
            'label' => \Carbon\Carbon::parse($date)->format('M d'),
            'value' => $v[$key],
        ])->values()->toArray();

        $metric = fn ($key, $current) => [
            'key' => $key,
            'label' => $key === 'profile_views' ? 'Profile Views'
                : ($key === 'qr_scans' ? 'QR Scans'
                : ($key === 'nfc_taps' ? 'NFC Taps'
                : ($key === 'connection_requests' ? 'Connection Requests'
                : ($key === 'total_connections' ? 'Total Connections' : $key)))),
            'value' => $current,
            'changePercent' => 0,
            'trend' => 'neutral',
        ];

        // Compare the current window against the immediately preceding window
        // of equal length to produce a real period-over-period change.
        $previous = function (string $type) use ($memberId, $days, $events) {
            if ($days === null) {
                return ['current' => $events->where('type', $type)->count(), 'previous' => 0];
            }
            $windowStart = now()->subDays($days)->startOfDay();
            $prevStart = $windowStart->copy()->subDays($days);
            $prevEnd = $windowStart->copy()->subSecond();

            $current = $events->where('type', $type)->count();
            $previous = AnalyticsEvent::where('member_id', $memberId)
                ->where('type', $type)
                ->whereBetween('created_at', [$prevStart, $prevEnd])
                ->count();
            return ['current' => $current, 'previous' => $previous];
        };

        $withTrend = function (array $base, array $cmp) {
            $current = $cmp['current'];
            $previous = $cmp['previous'];
            if ($previous > 0) {
                $base['changePercent'] = (int) round((($current - $previous) / $previous) * 100);
                $base['trend'] = $current >= $previous ? 'up' : 'down';
            } elseif ($current > 0) {
                $base['changePercent'] = 100;
                $base['trend'] = 'up';
            } else {
                $base['changePercent'] = 0;
                $base['trend'] = 'neutral';
            }
            return $base;
        };

        $totalConnections = Connection::where('member_id', $memberId)
            ->orWhere('guest_user_id', $memberId)
            ->where('status', 'approved')
            ->count();

        // Hour-of-day with the most engagement, computed from real event times.
        $mostActivePeriod = $events->isEmpty()
            ? 'N/A'
            : $events->groupBy(fn ($e) => $e->created_at->format('H:00'))
                ->sortByDesc->count()
                ->keys()
                ->first();

        return [
            'total_views' => $profileViews->count() + $events->whereIn('type', ['card_tap'])->count(),
            'profile_views' => $profileViews->count(),
            'card_taps' => $events->where('type', 'card_tap')->count(),
            'qr_scans' => $qrScans->count(),
            'connection_requests' => $connectionRequests->count(),
            'connection_accepted' => $connectionAccepted->count(),
            'contact_saves' => $events->where('type', 'contact_save')->count(),
            'whatsapp_taps' => $events->where('type', 'whatsapp_tap')->count(),
            'total' => $events->count(),
            'period' => $period,
            'metrics' => [
                $withTrend($metric('profile_views', $profileViews->count()), $previous('profile_view')),
                $withTrend($metric('qr_scans', $qrScans->count()), $previous('qr_scan')),
                $withTrend($metric('nfc_taps', $events->where('type', 'card_tap')->count()), $previous('card_tap')),
                $withTrend($metric('connection_requests', $connectionRequests->count()), $previous('connection_request')),
                $metric('total_connections', $totalConnections),
            ],
            'overview' => [
                'totalReach' => $events->count(),
                'engagementSummary' => $events->count() > 0 ? 'Active' : 'No activity yet',
                'mostActivePeriod' => $mostActivePeriod,
            ],
            'profileViewsChart' => $chart('profile_views'),
            'qrScansChart' => $chart('qr_scans'),
            'connectionRequestsChart' => $chart('connection_requests'),
            'activities' => $events->sortByDesc('created_at')->take(20)->map(fn ($e) => [
                'id' => (string) $e->id,
                'type' => $e->type === 'profile_view' ? 'profile_view'
                    : ($e->type === 'qr_scan' ? 'qr_scan'
                    : ($e->type === 'card_tap' ? 'nfc_tap'
                    : ($e->type === 'connection_request' ? 'connection_request'
                    : ($e->type === 'connection_accepted' ? 'connection_accepted' : $e->type)))),
                'timestamp' => $e->created_at->toIso8601String(),
                'description' => match ($e->type) {
                    'profile_view' => 'Someone viewed your profile',
                    'qr_scan' => 'Your QR code was scanned',
                    'card_tap' => 'Your NFC card was tapped',
                    'connection_request' => 'New connection request received',
                    'connection_accepted' => 'A connection request was accepted',
                    'contact_save' => 'Someone saved your contact',
                    'whatsapp_tap' => 'Someone tapped your WhatsApp link',
                    default => 'Activity recorded',
                },
            ])->values()->toArray(),
            'hasData' => $events->count() > 0,
        ];
    }
}