/**
 * Skeleton
 *
 * Reusable loading placeholder with theme-aware surfaces.
 */

import { cn } from "@/lib/cn";

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-roicard-bg-muted",
        className
      )}
      aria-hidden
    />
  );
}

/** Full-page centered spinner using theme tokens. */
export function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-roicard-bg">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-roicard-border border-t-roicard-primary"
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}
