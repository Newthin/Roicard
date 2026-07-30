/**
 * Analytics mock data generator.
 *
 * Produces realistic analytics payloads per date range filter.
 * Replace with API fetch when backend is ready.
 */

import type {
  AnalyticsChartPoint,
  AnalyticsData,
  AnalyticsDateRange,
  ActivityEvent,
} from "@/lib/analytics/types";

const RANGE_CONFIG: Record<
  AnalyticsDateRange,
  { days: number; points: number; multiplier: number }
> = {
  "7d": { days: 7, points: 7, multiplier: 1 },
  "30d": { days: 30, points: 10, multiplier: 3.2 },
  "90d": { days: 90, points: 12, multiplier: 8.5 },
  all: { days: 365, points: 12, multiplier: 24 },
};

/** Builds chart series with pseudo-random but stable values. */
function buildChartSeries(
  range: AnalyticsDateRange,
  base: number,
  variance: number
): AnalyticsChartPoint[] {
  const { days, points } = RANGE_CONFIG[range];
  const step = Math.max(1, Math.floor(days / points));

  return Array.from({ length: points }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (points - 1 - index) * step);

    const seed = (index + 1) * (base + variance);
    const value = Math.round(
      base + (seed % variance) + Math.sin(index * 0.8) * (variance * 0.4)
    );

    return {
      date: date.toISOString(),
      label: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      value: Math.max(0, value),
    };
  });
}

function buildActivities(range: AnalyticsDateRange): ActivityEvent[] {
  const now = Date.now();
  const hourMs = 3600000;

  const templates: Omit<ActivityEvent, "id" | "timestamp">[] = [
    {
      type: "connection_request",
      userName: "Sarah Johnson",
      description: "New connection request received",
    },
    {
      type: "profile_view",
      userName: "Alex Morgan",
      description: "Profile viewed",
    },
    {
      type: "qr_scan",
      description: "QR code scanned at networking event",
    },
    {
      type: "connection_accepted",
      userName: "John Doe",
      description: "Connection accepted",
    },
    {
      type: "nfc_tap",
      description: "NFC tap recorded",
    },
    {
      type: "profile_view",
      description: "Profile viewed via shared link",
    },
  ];

  const count = range === "7d" ? 5 : range === "30d" ? 6 : 8;

  return templates.slice(0, count).map((item, index) => ({
    id: `activity-${range}-${index}`,
    ...item,
    timestamp: new Date(now - (index + 1) * hourMs * (index + 2)).toISOString(),
  }));
}

/**
 * Returns mock analytics data for the selected date range.
 * Values scale with range multiplier for realistic filter behavior.
 */
export function getAnalyticsData(range: AnalyticsDateRange): AnalyticsData {
  const { multiplier } = RANGE_CONFIG[range];

  const profileViews = Math.round(142 * multiplier);
  const qrScans = Math.round(58 * multiplier);
  const nfcTaps = Math.round(24 * multiplier);
  const connectionRequests = Math.round(18 * multiplier);
  const totalConnections = Math.round(12 + multiplier * 2.5);

  const metrics = [
    {
      key: "profile_views",
      label: "Profile Views",
      value: profileViews,
      changePercent: 12.4,
      trend: "up" as const,
    },
    {
      key: "qr_scans",
      label: "QR Scans",
      value: qrScans,
      changePercent: 8.1,
      trend: "up" as const,
    },
    {
      key: "nfc_taps",
      label: "NFC Taps",
      value: nfcTaps,
      changePercent: -3.2,
      trend: "down" as const,
    },
    {
      key: "connection_requests",
      label: "Connection Requests",
      value: connectionRequests,
      changePercent: 15.6,
      trend: "up" as const,
    },
    {
      key: "total_connections",
      label: "Total Connections",
      value: totalConnections,
      changePercent: 6.0,
      trend: "up" as const,
    },
  ];

  return {
    metrics,
    overview: {
      totalReach: profileViews + qrScans + nfcTaps,
      engagementSummary: `${Math.round((connectionRequests / profileViews) * 100) || 4}% conversion rate`,
      mostActivePeriod:
        range === "7d"
          ? "Thursday afternoons"
          : range === "30d"
            ? "Weekdays 2–5 PM"
            : "Q1 networking events",
    },
    profileViewsChart: buildChartSeries(range, 12, 18),
    qrScansChart: buildChartSeries(range, 5, 10),
    connectionRequestsChart: buildChartSeries(range, 2, 6),
    activities: buildActivities(range),
    hasData: true,
  };
}

/** Compact summary for dashboard homepage widgets. */
export function getAnalyticsSummary() {
  const data = getAnalyticsData("30d");
  const views = data.metrics.find((m) => m.key === "profile_views");
  const connections = data.metrics.find((m) => m.key === "total_connections");
  const qr = data.metrics.find((m) => m.key === "qr_scans");

  return {
    totalViews: views?.value ?? 0,
    totalConnections: connections?.value ?? 0,
    qrScans: qr?.value ?? 0,
    viewsChange: views?.changePercent ?? 0,
    viewsTrend: views?.trend ?? "up",
  };
}
