/**
 * DashboardConnectionSummary
 *
 * Dashboard homepage cards for pending requests, recent connections,
 * and total connection count.
 */

"use client";

import { ConnectionCard } from "@/components/connections/ConnectionCard";
import { ConnectionStatsCard } from "@/components/connections/ConnectionStatsCard";
import { useConnections } from "@/components/connections/ConnectionsProvider";
import { ConnectionsLoadingState } from "@/components/connections/ConnectionsLoadingState";
import { Clock, Link2, Users } from "lucide-react";
import Link from "next/link";

export function DashboardConnectionSummary() {
  const { summary, isLoading } = useConnections();

  if (isLoading) {
    return <ConnectionsLoadingState />;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <ConnectionStatsCard
          label="Pending Requests"
          value={summary.pendingCount}
          href="/dashboard/connections/requests"
          icon={Clock}
          badge={summary.pendingCount}
        />
        <ConnectionStatsCard
          label="Total Connections"
          value={summary.totalConnections}
          href="/dashboard/connections"
          icon={Users}
        />
        <ConnectionStatsCard
          label="Network"
          value="Active"
          href="/dashboard/connections"
          icon={Link2}
        />
      </div>

      {summary.recentConnections.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-roicard-text">
              Recent Connections
            </h2>
            <Link
              href="/dashboard/connections"
              className="text-sm font-medium text-roicard-accent hover:text-roicard-text"
            >
              View all →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {summary.recentConnections.map((connection) => (
              <ConnectionCard key={connection.id} connection={connection} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
