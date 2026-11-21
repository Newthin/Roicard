/**
 * ExecutiveDashboardNavLink
 *
 * Sidebar link to the plan-gated Executive referral dashboard.
 * The server still enforces Executive access on /api/executive/dashboard.
 */

"use client";

import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/cn";
import { ExternalLink, Network } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type ExecutiveDashboardNavLinkProps = {
  onNavigate?: () => void;
};

export function ExecutiveDashboardNavLink({
  onNavigate,
}: ExecutiveDashboardNavLinkProps) {
  const { user } = useAuth();
  const pathname = usePathname();

  const plan = user?.plan ?? user?.subscription?.plan;
  if (plan !== "executive") return null;

  const isActive = pathname.startsWith("/executive");

  return (
    <div className="mt-6 border-t border-roicard-border pt-4">
      <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-roicard-text-muted">
        Executive
      </p>
      <Link
        href="/executive/referrals"
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          isActive
            ? "bg-roicard-primary/15 text-roicard-text border border-roicard-primary/30"
            : "text-roicard-text-muted hover:bg-roicard-bg-muted hover:text-roicard-text border border-transparent hover:border-roicard-accent/20"
        )}
      >
        <Network
          className={cn(
            "h-5 w-5",
            isActive ? "text-roicard-accent" : "text-roicard-text-muted"
          )}
        />
        <span className="flex-1">Referral network</span>
        <ExternalLink className="h-3.5 w-3.5 opacity-50" aria-hidden />
      </Link>
    </div>
  );
}
