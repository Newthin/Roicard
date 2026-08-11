/**
 * Admin Statistics View
 *
 * Platform-wide analytics with line and bar charts.
 * Route: /admin/statistics
 */

"use client";

import { StatsChart } from "@/components/admin/StatsChart";
import { AnalyticsChart } from "@/components/analytics/AnalyticsChart";
import { DateRangeFilter } from "@/components/analytics/DateRangeFilter";
import { getAdminTrends } from "@/lib/api/admin";
import type { AdminTrends } from "@/lib/api/admin";
import type { AdminDateRange } from "@/lib/admin/types";
import type { AnalyticsChartPoint } from "@/lib/analytics/types";
import { useCallback, useEffect, useState } from "react";

/** Maps admin chart points to analytics chart format for reuse. */
function toAnalyticsPoints(
  points: { label: string; value: number }[]
): AnalyticsChartPoint[] {
  return points.map((p) => ({
    label: p.label,
    value: p.value,
    date: p.label,
  }));
}

export function AdminStatisticsView() {
  const [range, setRange] = useState<AdminDateRange>("30d");
  const [data, setData] = useState<AdminTrends | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const trends = await getAdminTrends(range);
      setData(trends);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-roicard-border border-t-roicard-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-roicard-text-muted">Failed to load statistics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-roicard-text">
            Platform Statistics
          </h1>
          <p className="mt-1 text-sm text-roicard-text-muted">
            Growth trends and usage breakdown across ROICARD
          </p>
        </div>
        <DateRangeFilter
          value={range}
          onChange={(r) => setRange(r as AdminDateRange)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AnalyticsChart
          title="User Signups"
          data={toAnalyticsPoints(data.usersGrowth)}
          color="#E63946"
          gradientId="admin-users-growth"
        />
        <AnalyticsChart
          title="Connections Created"
          data={toAnalyticsPoints(data.connectionsGrowth)}
          color="#EF6B35"
          gradientId="admin-connections-growth"
        />
        <StatsChart
          title="NFC Usage Breakdown"
          data={data.nfcUsage}
          color="#FF8C42"
        />
        <AnalyticsChart
          title="Analytics Events"
          data={toAnalyticsPoints(data.profileViewTrends)}
          color="#FF8C42"
          gradientId="admin-profile-views"
        />
      </div>
    </div>
  );
}
