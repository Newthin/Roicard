/**
 * ConnectionsSubNav
 *
 * Tab navigation between My Connections and Requests pages.
 * Shows pending request count badge on the Requests tab.
 */

"use client";

import { useConnections } from "@/components/connections/ConnectionsProvider";
import { cn } from "@/lib/cn";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "My Connections", href: "/dashboard/connections" },
  { label: "Requests", href: "/dashboard/connections/requests" },
] as const;

export function ConnectionsSubNav() {
  const pathname = usePathname();
  const { summary } = useConnections();

  return (
    <nav
      className="flex flex-wrap gap-2 border-b border-roicard-border pb-4"
      aria-label="Connections navigation"
    >
      {TABS.map((tab) => {
        const isActive = pathname === tab.href;
        const isRequests = tab.href.includes("requests");

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-roicard-primary/15 text-roicard-text border border-roicard-primary/30"
                : "text-roicard-text-muted hover:bg-roicard-bg-muted hover:text-roicard-text"
            )}
          >
            {tab.label}
            {isRequests && summary.pendingCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-roicard-primary px-1.5 text-xs font-bold text-roicard-on-primary">
                {summary.pendingCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
