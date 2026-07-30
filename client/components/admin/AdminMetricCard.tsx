/**
 * AdminMetricCard
 *
 * Simple metric display for admin overview — no trend, minimal styling.
 * Reuses Card from the shared UI library.
 */

import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { type LucideIcon } from "lucide-react";

type AdminMetricCardProps = {
  label: string;
  value: number | string;
  icon?: LucideIcon;
  className?: string;
};

export function AdminMetricCard({
  label,
  value,
  icon: Icon,
  className,
}: AdminMetricCardProps) {
  return (
    <Card
      variant="default"
      className={cn("border-roicard-border bg-roicard-bg-elevated", className)}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-roicard-text-muted">{label}</p>
          <p className="mt-2 text-2xl font-bold text-roicard-text sm:text-3xl">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
        </div>
        {Icon && (
          <Icon className="h-5 w-5 shrink-0 text-roicard-accent" aria-hidden />
        )}
      </div>
    </Card>
  );
}
