/**
 * ProfileHero
 *
 * Centered identity block for the public profile: large circular avatar with
 * an overlapping verification badge, full name, professional title,
 * organization (with mark), and location.
 */

import { OrgAvatar } from "@/components/profile/public/OrgAvatar";
import { VerificationBadge } from "@/components/profile/public/VerificationBadge";
import { getFullName, getInitials } from "@/lib/profile/helpers";
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
  const initials = getInitials(fullName);
  const isVerified = profile.membershipStatus === "active";

  return (
    <header className="flex flex-col items-center px-2 pt-2 text-center">
      {/* Avatar + verification badge */}
      <div className="group relative">
        <div className="h-28 w-28 overflow-hidden rounded-full bg-roicard-bg-muted ring-4 ring-roicard-bg-elevated shadow-xl transition-transform duration-300 group-hover:scale-[1.03] sm:h-32 sm:w-32">
          {profile.profilePhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.profilePhotoUrl}
              alt={fullName}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-3xl font-bold text-roicard-text">
              {initials}
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
      <h1 className="mt-5 text-2xl font-bold tracking-tight text-roicard-text sm:text-[28px]">
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
    </header>
  );
}
