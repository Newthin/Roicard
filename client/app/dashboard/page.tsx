import { DashboardAnalyticsSummary } from "@/components/analytics/DashboardAnalyticsSummary";
import { ConnectionsProvider } from "@/components/connections/ConnectionsProvider";
import { DashboardConnectionSummary } from "@/components/connections/DashboardConnectionSummary";
import { ViewPublicProfileLink } from "@/components/profile/ViewPublicProfileLink";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <ConnectionsProvider>
      <div className="space-y-8">
        <div>
          <span className="inline-flex w-fit rounded-full bg-roicard-primary/15 px-3 py-1 text-xs font-medium text-roicard-accent">
            Dashboard
          </span>
          <h1 className="mt-3 text-2xl font-bold text-roicard-text sm:text-3xl">
            Welcome to ROICARD
          </h1>
          <p className="mt-2 text-sm text-roicard-text-muted sm:text-base">
            Your command center for managing your
            professional network.
          </p>
        </div>

        <DashboardAnalyticsSummary />

        <DashboardConnectionSummary />

        <ViewPublicProfileLink />
      </div>
    </ConnectionsProvider>
  );
}
