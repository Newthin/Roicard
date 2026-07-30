/**
 * PublicProfileCardStack
 *
 * Shared card stack for the public /[username] profile and owner previews
 * (onboarding review, dashboard hub). Renders ProfileHero, an optional
 * actions slot for visitor CTAs (Connect, Save Contact, WhatsApp), then the
 * detail cards. Omit `actions` when the member is previewing their own card.
 *
 * Layout is always a single vertical column — mobile-first, centered on larger
 * screens via the parent container (typically max-w-[480px]).
 */

import { GuestInviteCard } from "@/components/profile/public/GuestInviteCard";
import { InfoCard } from "@/components/profile/public/InfoCard";
import { InterestsCard } from "@/components/profile/public/InterestsCard";
import { OpportunitiesCard } from "@/components/profile/public/OpportunitiesCard";
import { ProfileHero } from "@/components/profile/public/ProfileHero";
import { SocialLinksCard } from "@/components/profile/public/SocialLinksCard";
import { WorkCard } from "@/components/profile/public/WorkCard";
import { cn } from "@/lib/cn";
import type { UserProfile } from "@/lib/profile/types";
import { User } from "lucide-react";
import { ReactNode } from "react";

type PublicProfileCardStackProps = {
  profile: UserProfile;
  /** Connect + secondary buttons — rendered between hero and detail cards. */
  actions?: ReactNode;
  /** Show the guest invitation card at the bottom (public profile only). */
  showGuestInvite?: boolean;
  className?: string;
};

export function PublicProfileCardStack({
  profile,
  actions,
  showGuestInvite = false,
  className,
}: PublicProfileCardStackProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <ProfileHero profile={profile} />

      {actions}

      {profile.bio.trim() && (
        <InfoCard icon={User} title="Professional Summary" collapsible defaultOpen>
          {profile.bio}
        </InfoCard>
      )}

      {profile.organization && (
        <WorkCard
          organization={profile.organization}
          title={profile.professionalTitle || "—"}
        />
      )}

      <OpportunitiesCard variant="seeking" content={profile.seeking} />
      <OpportunitiesCard variant="offering" content={profile.offering} />

      <InterestsCard interests={profile.interests} />

      <SocialLinksCard
        social={profile.social}
        email={profile.email}
        phone={profile.phone}
        whatsapp={profile.whatsapp}
      />

      {showGuestInvite && <GuestInviteCard name={profile.firstName} />}
    </div>
  );
}
