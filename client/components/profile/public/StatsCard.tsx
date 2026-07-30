/**
 * StatsCard
 *
 * Reusable metric card for profile engagement statistics.
 * Used in the profile stats grid (views, requests, connections).
 *
 * Props:
 * - label: stat name (e.g. "Profile Views")
 * - value: numeric or formatted stat value
 * - icon: optional Lucide icon component
 */

import { cn } from "@/lib/cn";
import { LucideIcon } from "lucide-react";

type StatsCardProps = {
  label: string;
  value: number | string;
  icon?: LucideIcon;
  className?: string;
};

export function StatsCard({ label, value, icon: Icon, className }: StatsCardProps) {
  return (
    <div
      className={cn(
        "glass-card rounded-2xl p-4 text-center transition-colors hover:border-roicard-accent/20 sm:p-5",
        className
      )}
    >
      {Icon && (
        <Icon className="mx-auto mb-2 h-5 w-5 text-roicard-accent" aria-hidden />
      )}
      <p className="text-2xl font-bold text-roicard-text sm:text-3xl">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <p className="mt-1 text-xs text-roicard-text-muted sm:text-sm">{label}</p>
    </div>
  );
}
