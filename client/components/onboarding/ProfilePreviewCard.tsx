/**
 * ProfilePreviewCard
 *
 * Live preview of the member's public ROICARD card for the dashboard hub.
 * Delegates to PublicProfileCardStack — hero and detail cards only. Visitor
 * actions (Connect, Save Contact, WhatsApp) are omitted when previewing
 * your own profile.
 */

"use client";

import { PublicProfileCardStack } from "@/components/profile/public/PublicProfileCardStack";
import { cn } from "@/lib/cn";
import type { OnboardingFormData, UserProfile } from "@/lib/profile/types";
import { generateUsername } from "@/lib/profile/username";

type ProfilePreviewCardProps = {
  /** Current onboarding form data to preview */
  data: OnboardingFormData;
  /** Actual username when previewing a saved profile (optional) */
  username?: string;
  /** Optional extra class names for layout positioning */
  className?: string;
};

export function ProfilePreviewCard({
  data,
  username: usernameProp,
  className,
}: ProfilePreviewCardProps) {
  const username =
    usernameProp ??
    generateUsername(data.firstName || "your", data.lastName || "name");

  const profile: UserProfile = {
    ...data,
    firstName: data.firstName || "Your",
    lastName: data.lastName || "Name",
    username,
    createdAt: new Date().toISOString(),
    membershipStatus: "active",
  };

  return (
    <div className={cn("w-full max-w-[480px]", className)}>
      <PublicProfileCardStack profile={profile} />
    </div>
  );
}
