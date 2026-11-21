/**
 * MemberReferralNavLink
 *
 * Sidebar entry for the verified-member referral dashboard. The server still
 * enforces eligibility on /api/referrals/dashboard; this link only avoids
 * showing an unusable page to unverified or deactivated accounts.
 */

"use client";

import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/cn";
import { Gift } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type MemberReferralNavLinkProps = {
  onNavigate?: () => void;
};

export function MemberReferralNavLink({ onNavigate }: MemberReferralNavLinkProps) {
  const { user } = useAuth();
  const pathname = usePathname();

  if (!user?.email_verified || user.is_deactivated) return null;
  if (user.role === "admin" || user.plan === "executive") return null;

  const isActive = pathname === "/dashboard/referrals";

  return (
    <Link
      href="/dashboard/referrals"
      onClick={onNavigate}
      className={cn(
        "mt-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        isActive
          ? "bg-roicard-primary/15 text-roicard-text border border-roicard-primary/30"
          : "text-roicard-text-muted hover:bg-roicard-bg-muted hover:text-roicard-text border border-transparent hover:border-roicard-accent/20"
      )}
    >
      <Gift
        className={cn(
          "h-5 w-5",
          isActive ? "text-roicard-accent" : "text-roicard-text-muted"
        )}
      />
      Referrals
    </Link>
  );
}
