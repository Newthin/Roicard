/**
 * AnalyticsMetricCard
 *
 * Displays a single analytics metric with value, trend %, and direction.
 * Extends the dashboard card pattern used by ConnectionStatsCard.
 */

import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import type { AnalyticsMetric } from "@/lib/analytics/types";
import { Minus, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";

type AnalyticsMetricCardProps = {
  metric: AnalyticsMetric;
  icon?: LucideIcon;
  className?: string;
};

export function AnalyticsMetricCard({
  metric,
  icon: Icon,
  className,
}: AnalyticsMetricCardProps) {
  const TrendIcon =
    metric.trend === "up"
      ? TrendingUp
      : metric.trend === "down"
        ? TrendingDown
        : Minus;

  const trendColor =
    metric.trend === "up"
      ? "text-emerald-400"
      : metric.trend === "down"
        ? "text-red-400"
        : "text-roicard-text-muted";

  return (
    <Card variant="elevated" className={cn("glass-card", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-roicard-text-muted">{metric.label}</p>
          <p className="mt-2 text-3xl font-bold text-roicard-text">
            {metric.value.toLocaleString()}
          </p>
          <div className={cn("mt-2 flex items-center gap-1.5 text-sm", trendColor)}>
            <TrendIcon className="h-4 w-4" aria-hidden />
            <span>
              {metric.changePercent > 0 ? "+" : ""}
              {metric.changePercent}%
            </span>
            <span className="text-roicard-text-muted">vs prior period</span>
          </div>
        </div>
        {Icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-roicard-primary/10">
            <Icon className="h-5 w-5 text-roicard-accent" aria-hidden />
          </div>
        )}
      </div>
    </Card>
  );
}
