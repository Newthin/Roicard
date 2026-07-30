/**
 * AnalyticsOverview
 *
 * Overview section: total reach, engagement summary, most active period.
 */

import { Card } from "@/components/ui/Card";
import type { AnalyticsOverview as AnalyticsOverviewData } from "@/lib/analytics/types";
import { Activity, Clock, Users } from "lucide-react";

type AnalyticsOverviewProps = {
  overview: AnalyticsOverviewData;
};

export function AnalyticsOverview({ overview }: AnalyticsOverviewProps) {
  const items = [
    {
      label: "Total Profile Reach",
      value: overview.totalReach.toLocaleString(),
      icon: Users,
    },
    {
      label: "Engagement Summary",
      value: overview.engagementSummary,
      icon: Activity,
    },
    {
      label: "Most Active Period",
      value: overview.mostActivePeriod,
      icon: Clock,
    },
  ];

  return (
    <section aria-label="Analytics overview">
      <h2 className="mb-4 text-lg font-semibold text-roicard-text">Overview</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {items.map(({ label, value, icon: Icon }) => (
          <Card key={label} variant="elevated" className="glass-card">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-roicard-primary/10">
                <Icon className="h-5 w-5 text-roicard-accent" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-roicard-text-muted">{label}</p>
                <p className="mt-1 text-lg font-semibold text-roicard-text">{value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
