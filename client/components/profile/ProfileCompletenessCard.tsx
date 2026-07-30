/**
 * ProfileCompletenessCard
 *
 * Shows profile completion progress and missing fields for the profile hub.
 */

"use client";

import { getProfileCompleteness } from "@/lib/profile/completeness";
import type { OnboardingFormData } from "@/lib/profile/types";
import { cn } from "@/lib/cn";
import Link from "next/link";

type ProfileCompletenessCardProps = {
  data: OnboardingFormData;
};

export function ProfileCompletenessCard({ data }: ProfileCompletenessCardProps) {
  const { percent, completedCount, totalCount, missing } =
    getProfileCompleteness(data);

  return (
    <div className="rounded-xl border border-roicard-border bg-roicard-bg-elevated p-5 theme-transition">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-roicard-text">
            Profile completeness
          </h2>
          <p className="mt-1 text-xs text-roicard-text-muted">
            {completedCount} of {totalCount} sections complete
          </p>
        </div>
        <span
          className={cn(
            "text-2xl font-bold",
            percent >= 80 ? "text-emerald-400" : "text-roicard-accent"
          )}
        >
          {percent}%
        </span>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-roicard-bg-muted">
        <div
          className="h-full rounded-full roicard-gradient transition-all duration-500"
          style={{ width: `${percent}%` }}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Profile completeness"
        />
      </div>

      {missing.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-roicard-text-muted">
            Still to add:
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {missing.slice(0, 4).map((item) => (
              <li
                key={item.key}
                className="rounded-full border border-roicard-border bg-roicard-bg-muted px-2.5 py-0.5 text-xs text-roicard-text-muted"
              >
                {item.label}
              </li>
            ))}
            {missing.length > 4 && (
              <li className="text-xs text-roicard-text-muted">
                +{missing.length - 4} more
              </li>
            )}
          </ul>
          <Link
            href="/dashboard/settings"
            className="mt-3 inline-block text-xs font-medium text-roicard-accent hover:text-roicard-text"
          >
            Complete in Settings →
          </Link>
        </div>
      )}
    </div>
  );
}
