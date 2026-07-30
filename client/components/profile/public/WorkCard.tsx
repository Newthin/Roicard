/**
 * WorkCard
 *
 * "Current Work" section showing the member's organization, role, and an
 * optional employment start date. The organization mark falls back to initials
 * when no logo URL is supplied.
 */

import { OrgAvatar } from "@/components/profile/public/OrgAvatar";
import { ProfileCard } from "@/components/profile/public/ProfileCard";
import { Briefcase, Calendar, ChevronRight } from "lucide-react";

type WorkCardProps = {
  organization: string;
  title: string;
  /** Optional human-readable start date, e.g. "May 2023". */
  startDate?: string;
  /** Optional organization logo URL. */
  logoUrl?: string | null;
};

export function WorkCard({
  organization,
  title,
  startDate,
  logoUrl,
}: WorkCardProps) {
  return (
    <ProfileCard>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 pt-4">
        <span className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-roicard-primary/10 text-roicard-accent">
            <Briefcase className="h-4 w-4" aria-hidden />
          </span>
          <span className="text-sm font-semibold text-roicard-text">
          Current Role
          </span>
        </span>
        <ChevronRight
          className="h-4 w-4 shrink-0 text-roicard-text-muted"
          aria-hidden
        />
      </div>

      {/* Body */}
      <div className="flex items-start gap-3 px-5 pb-5 pt-3">
        <OrgAvatar name={organization} logoUrl={logoUrl} size="md" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-roicard-text">
            {title}
          </p>
          <p className="truncate text-sm text-roicard-text-muted">
            {organization}
          </p>
          {startDate && (
            <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-roicard-text-muted">
              <Calendar className="h-3.5 w-3.5 text-roicard-accent" aria-hidden />
              Since {startDate}
            </p>
          )}
        </div>
      </div>
    </ProfileCard>
  );
}
