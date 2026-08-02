"use client";

import { DashboardAnalyticsSummary } from "@/components/analytics/DashboardAnalyticsSummary";
import { ConnectionsProvider } from "@/components/connections/ConnectionsProvider";
import { DashboardConnectionSummary } from "@/components/connections/DashboardConnectionSummary";
import { MembershipPaymentCard } from "@/components/payments/MembershipPaymentCard";
import { ViewPublicProfileLink } from "@/components/profile/ViewPublicProfileLink";
import { useAuth } from "@/contexts/AuthContext";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <ConnectionsProvider>
      <div className="space-y-8">
        <div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-roicard-primary/15 px-3 py-1 text-xs font-medium text-roicard-accent">
            Dashboard
            {user?.status === "draft" ? (
              <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-400">
                Draft
              </span>
            ) : (
              <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                Active
              </span>
            )}
          </span>
          <h1 className="mt-3 text-2xl font-bold text-roicard-text sm:text-3xl">
            Welcome to ROICARD
          </h1>
          <p className="mt-2 text-sm text-roicard-text-muted sm:text-base">
            Your command center for managing your
            professional network.
          </p>
        </div>

        {user?.status !== "active" && <MembershipPaymentCard />}

        <DashboardAnalyticsSummary />

        <DashboardConnectionSummary />

        <ViewPublicProfileLink />
      </div>
    </ConnectionsProvider>
  );
}
