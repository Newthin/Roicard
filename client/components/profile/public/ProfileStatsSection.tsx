/**
 * ProfileStatsSection
 *
 * Grid of engagement statistics for the public profile (UI only).
 * Uses deterministic mock values derived from username.
 *
 * Props:
 * - username: public profile slug for consistent mock stats
 */

import { StatsCard } from "@/components/profile/public/StatsCard";
import { getMockProfileStats } from "@/lib/profile/helpers";
import { Eye, UserCheck, Users } from "lucide-react";

type ProfileStatsSectionProps = {
  username: string;
};

export function ProfileStatsSection({ username }: ProfileStatsSectionProps) {
  const stats = getMockProfileStats(username);

  return (
    <section aria-label="Profile statistics">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-roicard-accent">
        Insights
      </h2>
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <StatsCard
          label="Profile Views"
          value={stats.profileViews}
          icon={Eye}
        />
        <StatsCard
          label="Requests"
          value={stats.connectionRequests}
          icon={UserCheck}
        />
        <StatsCard
          label="Connections"
          value={stats.totalConnections}
          icon={Users}
        />
      </div>
    </section>
  );
}
