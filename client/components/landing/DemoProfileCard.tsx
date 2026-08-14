/**
 * DemoProfileCard
 *
 * Premium ROICARD profile preview for the landing demo section. Reuses the
 * shared LandingProfilePreview so it looks identical to the live public profile
 * card at /alex-morgan (the demo persona visitors can explore after signup).
 */

import { LandingProfilePreview } from "@/components/landing/LandingProfilePreview";
import { DEMO_USER_PROFILE } from "@/lib/profile/demo";

export function DemoProfileCard() {
  return (
    <LandingProfilePreview
      profile={DEMO_USER_PROFILE}
      className="mx-auto shadow-2xl shadow-black/40 ring-1 ring-white/10 transition-transform duration-500 hover:scale-[1.02]"
    />
  );
}