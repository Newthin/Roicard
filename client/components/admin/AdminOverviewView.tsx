/**
 * AdminOverviewView
 *
 * Admin dashboard overview — platform metrics, activity, quick actions.
 * Route: /admin
 */

"use client";

import { AdminActivityFeed } from "@/components/admin/AdminActivityFeed";
import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import { useAdmin } from "@/components/admin/AdminProvider";
import { Button } from "@/components/ui/Button";
import { Eye, Link2, Nfc, Users } from "lucide-react";
import { useRouter } from "next/navigation";

export function AdminOverviewView() {
  const { overview, isLoading } = useAdmin();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-roicard-border border-t-roicard-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-roicard-text">Admin Overview</h1>
        <p className="mt-1 text-sm text-roicard-text-muted">
          Platform-wide metrics and system activity
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard
          label="Total Users"
          value={overview.totalUsers}
          icon={Users}
        />
        <AdminMetricCard
          label="Total Connections"
          value={overview.totalConnections}
          icon={Link2}
        />
        <AdminMetricCard
          label="Roicard Assignments"
          value={overview.totalNfcAssignments}
          icon={Nfc}
        />
        <AdminMetricCard
          label="Profile Views"
          value={overview.totalProfileViews}
          icon={Eye}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminActivityFeed />

        <div className="rounded-xl border border-roicard-border bg-roicard-bg-elevated p-5">
          <h2 className="text-sm font-semibold text-roicard-text">Quick Actions</h2>
          <p className="mt-1 text-sm text-roicard-text-muted">
            Common admin tasks
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <Button
              variant="secondary"
              fullWidth
              className="justify-start rounded-lg"
              onClick={() => router.push("/admin/users")}
            >
              Manage Users
            </Button>
            <Button
              variant="secondary"
              fullWidth
              className="justify-start rounded-lg"
              onClick={() => router.push("/admin/nfc")}
            >
              Assign Roicard
            </Button>
            <Button
              variant="secondary"
              fullWidth
              className="justify-start rounded-lg"
              onClick={() => router.push("/admin/statistics")}
            >
              View Statistics
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
