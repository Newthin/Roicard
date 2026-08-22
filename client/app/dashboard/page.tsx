"use client";

import { DashboardAnalyticsSummary } from "@/components/analytics/DashboardAnalyticsSummary";
import { ConnectionsProvider } from "@/components/connections/ConnectionsProvider";
import { DashboardConnectionSummary } from "@/components/connections/DashboardConnectionSummary";
import { DraftCountdown } from "@/components/dashboard/DraftCountdown";
import { MembershipPaymentCard } from "@/components/payments/MembershipPaymentCard";
import { ViewPublicProfileLink } from "@/components/profile/ViewPublicProfileLink";
import { useAuth } from "@/contexts/AuthContext";
import { useLiveMemberStatus } from "@/hooks/useLiveMemberStatus";

export default function DashboardPage() {
  const { user } = useAuth();
  const { status: liveStatus, draftClosesAt, isLoading: liveLoading } = useLiveMemberStatus();
  const effectiveStatus = liveStatus ?? user?.status;
  const showPayCard = effectiveStatus !== "active";

  return (
    <ConnectionsProvider>
      <div className="space-y-8">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-roicard-primary/15 px-3 py-1 text-xs font-medium text-roicard-accent">
              Dashboard
            </span>
            {effectiveStatus === "draft" ? (
              <span className="inline-flex w-fit items-center rounded bg-amber-500/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-400">
                Draft
              </span>
            ) : (
              <span className="inline-flex w-fit items-center rounded bg-emerald-500/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                Active
              </span>
            )}
          </div>
          <h1 className="mt-3 text-2xl font-bold text-roicard-text sm:text-3xl">
            Welcome{user?.first_name ? `, ${user.first_name}` : " to ROICARD"}
          </h1>
          <p className="mt-2 text-sm text-roicard-text-muted sm:text-base">
            Your command center for managing your
            professional network.
          </p>
        </div>

        {!liveLoading && effectiveStatus === "draft" && draftClosesAt && (
          <DraftCountdown closesAt={draftClosesAt} />
        )}

        {!liveLoading && showPayCard && <MembershipPaymentCard />}

        <DashboardAnalyticsSummary />

        <DashboardConnectionSummary />

        <ViewPublicProfileLink />
      </div>
    </ConnectionsProvider>
  );
}
