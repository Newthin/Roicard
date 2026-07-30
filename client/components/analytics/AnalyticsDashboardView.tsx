/**
 * AnalyticsDashboardView
 *
 * Main analytics page — metrics, charts, overview, activity timeline.
 * Route: /dashboard/analytics
 */

"use client";

import { ActivityTimeline } from "@/components/analytics/ActivityTimeline";
import { AnalyticsChart } from "@/components/analytics/AnalyticsChart";
import { AnalyticsMetricCard } from "@/components/analytics/AnalyticsMetricCard";
import { AnalyticsOverview } from "@/components/analytics/AnalyticsOverview";
import { DateRangeFilter } from "@/components/analytics/DateRangeFilter";
import { EmptyAnalyticsState } from "@/components/analytics/EmptyAnalyticsState";
import type { AnalyticsDateRange, AnalyticsData } from "@/lib/analytics/types";
import { getPublicProfileUrl } from "@/lib/profile/username";
import { usePublicProfileUsername } from "@/hooks/usePublicProfileUsername";
import type { LucideIcon } from "lucide-react";
import {
  Eye,
  Link2,
  Nfc,
  QrCode,
  UserPlus,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import apiClient from "@/lib/api/client";

const METRIC_ICONS: Record<string, LucideIcon> = {
  profile_views: Eye,
  qr_scans: QrCode,
  nfc_taps: Nfc,
  connection_requests: UserPlus,
  total_connections: Link2,
};

export function AnalyticsDashboardView() {
  const [range, setRange] = useState<AnalyticsDateRange>("30d");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { username } = usePublicProfileUsername();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: response } = await apiClient.get("/analytics/summary", {
        params: { period: range },
      });
      setData(response);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleShare = async () => {
    if (!username) return;
    const url = getPublicProfileUrl(username);
    if (navigator.share) {
      try {
        await navigator.share({ title: "My ROICARD", url });
      } catch {
        // cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      alert("Profile link copied!");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-roicard-border border-t-roicard-primary" />
      </div>
    );
  }

  if (!data?.hasData) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-roicard-text">Analytics</h1>
          <p className="mt-1 text-sm text-roicard-text-muted">
            Track profile performance and networking activity
          </p>
        </div>
        <EmptyAnalyticsState onShare={username ? handleShare : undefined} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-roicard-text">Analytics</h1>
          <p className="mt-1 text-sm text-roicard-text-muted">
            Track profile performance and networking activity
          </p>
        </div>
        <DateRangeFilter value={range} onChange={setRange} />
      </div>

      {/* Key metrics grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {data.metrics.map((metric: any) => (
          <AnalyticsMetricCard
            key={metric.key}
            metric={metric}
            icon={METRIC_ICONS[metric.key]}
          />
        ))}
      </div>

      <AnalyticsOverview overview={data.overview} />

      {/* Charts section */}
      <section aria-label="Analytics charts">
        <h2 className="mb-4 text-lg font-semibold text-roicard-text">Trends</h2>
        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          <AnalyticsChart
            title="Profile Views Over Time"
            data={data.profileViewsChart}
            color="#E63946"
            gradientId="viewsGradient"
          />
          <AnalyticsChart
            title="QR Scans Over Time"
            data={data.qrScansChart}
            color="#FF8C42"
            gradientId="qrGradient"
          />
          <AnalyticsChart
            title="Connection Requests Over Time"
            data={data.connectionRequestsChart}
            color="#EF6B35"
            gradientId="requestsGradient"
          />
        </div>
      </section>

      <ActivityTimeline activities={data.activities} />
    </div>
  );
}
