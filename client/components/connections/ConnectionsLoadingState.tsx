/**
 * ConnectionsLoadingState
 *
 * Skeleton loading UI for connection pages using theme-aware placeholders.
 */

import { Skeleton } from "@/components/ui/Skeleton";

export function ConnectionsLoadingState() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading connections">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="glass-card flex items-center gap-4 rounded-2xl p-5 theme-transition"
        >
          <Skeleton className="h-14 w-14 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
