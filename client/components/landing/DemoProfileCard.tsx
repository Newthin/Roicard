/**
 * DemoProfileCard
 *
 * Premium ROICARD profile preview for the landing demo section. Reuses the
 * shared LandingProfilePreview so it looks identical to the live public profile
 * card at /[username].
 */

import { LandingProfilePreview } from "@/components/landing/LandingProfilePreview";
import { EMPTY_ONBOARDING_DATA, type UserProfile } from "@/lib/profile/types";

/** Mock identity showcased in the landing demo preview. */
const DEMO_PROFILE: UserProfile = {
  ...EMPTY_ONBOARDING_DATA,
  firstName: "Sarah",
  lastName: "Johnson",
  profilePhotoUrl: "/images/demo-avatar-female.png",
  professionalTitle: "VP of Partnerships",
  organization: "Nexus Ventures",
  location: "New York, NY",
  bio: "Connecting founders, investors, and operators. Passionate about building networks that create real business opportunities.",
  email: "sarah@nexusventures.com",
  username: "sarah-johnson",
  createdAt: new Date().toISOString(),
  membershipStatus: "active",
};

export function DemoProfileCard() {
  return (
    <LandingProfilePreview
      profile={DEMO_PROFILE}
      className="mx-auto shadow-2xl shadow-black/40 ring-1 ring-white/10 transition-transform duration-500 hover:scale-[1.02]"
    />
  );
}
