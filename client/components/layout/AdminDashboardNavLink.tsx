/**
 * AdminDashboardNavLink
 *
 * Sidebar link from the user dashboard to the admin control panel (/admin).
 * Shown in a separate "Admin" section below main navigation.
 *
 * Props:
 * - onNavigate: called when link is clicked (closes mobile drawer)
 */

"use client";

import { cn } from "@/lib/cn";
import { ExternalLink, Shield } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type AdminDashboardNavLinkProps = {
  onNavigate?: () => void;
};

export function AdminDashboardNavLink({
  onNavigate,
}: AdminDashboardNavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname.startsWith("/admin");

  return (
    <div className="mt-6 border-t border-roicard-border pt-4">
      <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-roicard-text-muted">
        Admin
      </p>
      <Link
        href="/admin"
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          isActive
            ? "bg-roicard-primary/15 text-roicard-text border border-roicard-primary/30"
            : "text-roicard-text-muted hover:bg-roicard-bg-muted hover:text-roicard-text border border-transparent hover:border-roicard-accent/20"
        )}
      >
        <Shield
          className={cn(
            "h-5 w-5",
            isActive ? "text-roicard-accent" : "text-roicard-text-muted"
          )}
        />
        <span className="flex-1">Admin Dashboard</span>
        <ExternalLink className="h-3.5 w-3.5 opacity-50" aria-hidden />
      </Link>
    </div>
  );
}
