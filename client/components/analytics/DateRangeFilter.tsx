/**
 * DateRangeFilter
 *
 * Analytics date range selector — updates parent filter state.
 * Options: 7d, 30d, 90d, all time.
 */

"use client";

import { cn } from "@/lib/cn";
import type { AnalyticsDateRange } from "@/lib/analytics/types";

const OPTIONS: { value: AnalyticsDateRange; label: string }[] = [
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "90d", label: "Last 90 Days" },
  { value: "all", label: "All Time" },
];

type DateRangeFilterProps = {
  value: AnalyticsDateRange;
  onChange: (range: AnalyticsDateRange) => void;
};

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  return (
    <div
      className="flex flex-wrap gap-2"
      role="group"
      aria-label="Date range filter"
    >
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            value === option.value
              ? "bg-roicard-primary/15 text-roicard-text border border-roicard-primary/30"
              : "border border-roicard-border text-roicard-text-muted hover:bg-roicard-bg-muted hover:text-roicard-text"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
