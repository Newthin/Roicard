/**
 * ProfileHero
 *
 * Premium profile card header for the public profile: a gradient brand banner
 * with the member's avatar overlapping it, followed by full name, professional
 * title, organization (with mark), and location.
 */

import { OrgAvatar } from "@/components/profile/public/OrgAvatar";
import { VerificationBadge } from "@/components/profile/public/VerificationBadge";
import { getFullName } from "@/lib/profile/helpers";
import type { UserProfile } from "@/lib/profile/types";
import { MapPin } from "lucide-react";

type ProfileHeroProps = {
  profile: UserProfile;
  /** Optional organization logo URL (falls back to initials when absent). */
  organizationLogoUrl?: string | null;
};

export function ProfileHero({
  profile,
  organizationLogoUrl,
}: ProfileHeroProps) {
  const fullName = getFullName(profile);
  const isVerified = profile.membershipStatus === "active";

  return (
    <header className="relative overflow-hidden rounded-3xl border border-roicard-border/70 bg-roicard-bg-elevated/80 shadow-[0_10px_30px_-12px_var(--rc-shadow)] backdrop-blur-sm theme-transition">
      {/* Brand banner */}
      <div className="relative h-24 roicard-gradient sm:h-28">
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(255,255,255,0.28),transparent_52%)]"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_12%_120%,rgba(0,0,0,0.18),transparent_55%)]"
          aria-hidden
        />
      </div>

      {/* Identity */}
      <div className="flex flex-col items-center px-5 pb-6 pt-0 text-center">
        {/* Avatar + verification badge */}
        <div className="relative -mt-14 sm:-mt-16">
          <div className="h-28 w-28 overflow-hidden rounded-full bg-roicard-bg-muted shadow-xl ring-4 ring-roicard-bg-elevated sm:h-32 sm:w-32">
            {profile.profilePhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.profilePhotoUrl}
                alt={fullName}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-roicard-primary/20">
                <svg viewBox="0 0 24 24" fill="none" className="h-16 w-16" aria-hidden>
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" fill="currentColor"/>
                </svg>
              </span>
            )}
          </div>

          {isVerified && (
            <VerificationBadge
              size={30}
              className="absolute bottom-1.5 right-1.5"
            />
          )}
        </div>

        {/* Name */}
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-roicard-text sm:text-[28px]">
          {fullName}
        </h1>

        {/* Professional title */}
        {profile.professionalTitle && (
          <p className="mt-1.5 text-base font-semibold roicard-gradient-text">
            {profile.professionalTitle}
          </p>
        )}

        {/* Organization */}
        {profile.organization && (
          <div className="mt-2 inline-flex items-center gap-2">
            <span className="text-sm font-medium text-roicard-text">
              {profile.organization}
            </span>
            <OrgAvatar
              name={profile.organization}
              logoUrl={organizationLogoUrl}
              size="sm"
            />
          </div>
        )}

        {/* Location */}
        {profile.location && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-roicard-text-muted">
            <MapPin className="h-4 w-4 text-roicard-accent" aria-hidden />
            {profile.location}
          </p>
        )}
      </div>
    </header>
  );
}
