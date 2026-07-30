/**
 * ActivityTimeline
 *
 * Recent analytics activity feed — views, scans, requests, connections.
 */

import type { ActivityEvent } from "@/lib/analytics/types";
import {
  CheckCircle2,
  Eye,
  Nfc,
  QrCode,
  UserPlus,
} from "lucide-react";

type ActivityTimelineProps = {
  activities: ActivityEvent[];
};

const ACTIVITY_ICONS = {
  profile_view: Eye,
  qr_scan: QrCode,
  nfc_tap: Nfc,
  connection_request: UserPlus,
  connection_accepted: CheckCircle2,
};

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  return (
    <section aria-label="Recent activity">
      <h2 className="mb-4 text-lg font-semibold text-roicard-text">Recent Activity</h2>
      <div className="glass-card divide-y divide-roicard-border/60 rounded-2xl">
        {activities.map((activity) => {
          const Icon = ACTIVITY_ICONS[activity.type];

          return (
            <div
              key={activity.id}
              className="flex items-start gap-4 p-4 sm:p-5"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-roicard-primary/10">
                <Icon className="h-5 w-5 text-roicard-accent" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-roicard-text">
                  {activity.description}
                </p>
                {activity.userName && (
                  <p className="mt-0.5 text-sm text-roicard-text-muted">
                    {activity.userName}
                  </p>
                )}
                <p className="mt-1 text-xs text-roicard-text-muted/80">
                  {formatTimestamp(activity.timestamp)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
