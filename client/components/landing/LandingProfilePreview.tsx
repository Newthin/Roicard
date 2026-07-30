/**
 * LandingProfilePreview
 *
 * A landing-page showcase card that mirrors the real public profile card exactly
 * by reusing the same components (ProfileHero, GradientActionButton,
 * SecondaryActionButtons) inside the shared ProfileCard shell.
 *
 * Used by both the hero floating mock and the demo preview section so marketing
 * visuals stay perfectly in sync with the live /[username] experience.
 *
 * Props:
 * - profile: mock UserProfile to render
 * - className: optional wrapper styling (sizing, hover, etc.)
 */

"use client";

import { GradientActionButton } from "@/components/profile/public/GradientActionButton";
import { ProfileCard } from "@/components/profile/public/ProfileCard";
import { ProfileHero } from "@/components/profile/public/ProfileHero";
import { SecondaryActionButtons } from "@/components/profile/public/SecondaryActionButtons";
import { cn } from "@/lib/cn";
import type { UserProfile } from "@/lib/profile/types";
import { UserPlus } from "lucide-react";

type LandingProfilePreviewProps = {
  profile: UserProfile;
  className?: string;
};

/** No-op handlers — the preview is a visual showcase, not a live profile. */
const noop = () => {};

export function LandingProfilePreview({
  profile,
  className,
}: LandingProfilePreviewProps) {
  return (
    <ProfileCard
      className={cn("relative w-full max-w-sm overflow-hidden p-6 sm:p-7", className)}
    >
      <div className="relative">
        <ProfileHero profile={profile} />

        <div className="mt-6 space-y-3">
          <GradientActionButton
            icon={<UserPlus className="h-5 w-5" aria-hidden />}
          >
            Connect
          </GradientActionButton>
          <SecondaryActionButtons onSaveContact={noop} onWhatsApp={noop} />
        </div>
      </div>
    </ProfileCard>
  );
}
