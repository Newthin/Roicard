/**
 * DashboardAnalyticsSummary
 *
 * Compact analytics widgets for the dashboard homepage.
 * Shows total views, connections, and QR activity summary.
 */

"use client";

import { ConnectionStatsCard } from "@/components/connections/ConnectionStatsCard";
import { getAnalyticsSummary } from "@/lib/api/analytics";
import { Eye, QrCode, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export function DashboardAnalyticsSummary() {
  const [summary, setSummary] = useState<{
    totalViews: number;
    totalConnections: number;
    qrScans: number;
  } | null>(null);

  useEffect(() => {
    getAnalyticsSummary("30d")
      .then((data) =>
        setSummary({
          totalViews: data.total_views ?? data.total ?? 0,
          totalConnections: data.connection_requests ?? 0,
          qrScans: data.qr_scans ?? 0,
        })
      )
      .catch(() => setSummary({ totalViews: 0, totalConnections: 0, qrScans: 0 }));
  }, []);

  if (!summary) {
    return (
      <div className="flex h-24 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-roicard-border border-t-roicard-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-roicard-text">Analytics Snapshot</h2>
        <Link
          href="/dashboard/analytics"
          className="text-sm font-medium text-roicard-accent hover:text-roicard-text"
        >
          View analytics →
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <ConnectionStatsCard
          label="Total Views"
          value={summary.totalViews.toLocaleString()}
          href="/dashboard/analytics"
          icon={Eye}
        />
        <ConnectionStatsCard
          label="Connection Requests"
          value={summary.totalConnections}
          href="/dashboard/connections"
          icon={Users}
        />
        <ConnectionStatsCard
          label="QR Scans (30d)"
          value={summary.qrScans}
          href="/dashboard/analytics"
          icon={QrCode}
        />
      </div>
    </div>
  );
}
