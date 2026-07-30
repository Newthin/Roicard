/**
 * Step 12 — Review Profile
 *
 * Final review before going live. Uses the shared PublicProfileCardStack so
 * the layout matches the live /[username] page — hero and detail cards only.
 * Visitor actions are omitted (member previewing their own card).
 *
 * The chevron backdrop is rendered at the JourneyLayout level so it spans
 * the full header width, matching the public profile page.
 */

"use client";

import { useJourney } from "@/components/onboarding/journey/JourneyContext";
import { StepHeading } from "@/components/onboarding/journey/StepHeading";
import { PublicProfileCardStack } from "@/components/profile/public/PublicProfileCardStack";
import { Button } from "@/components/ui/Button";
import type { UserProfile } from "@/lib/profile/types";
import { generateUsername } from "@/lib/profile/username";
import { useMemo } from "react";

export function StepReview() {
  const { data, next, goTo } = useJourney();

  const profile: UserProfile = useMemo(
    () => ({
      ...data,
      firstName: data.firstName || "Your",
      lastName: data.lastName || "Name",
      username: generateUsername(
        data.firstName || "your",
        data.lastName || "name"
      ),
      createdAt: new Date().toISOString(),
      membershipStatus: "active",
    }),
    [data]
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="mx-auto w-full max-w-[480px]">
        <StepHeading
          eyebrow="Review"
          title="Review your profile"
          description="This is how visitors will see your ROICARD. Take a final look before your professional identity goes live."
        />
      </div>

      <div className="relative mx-auto w-full max-w-[480px] px-0 sm:px-2">
        <PublicProfileCardStack profile={profile} />
      </div>

      <div className="mx-auto flex w-full max-w-[480px] flex-col gap-3 px-0 sm:px-2">
        <Button onClick={next} className="h-12 w-full rounded-2xl text-base">
          Looks Good, Continue
        </Button>
        <Button
          variant="secondary"
          onClick={() => goTo("about")}
          className="h-12 w-full rounded-2xl text-base"
        >
          Edit Information
        </Button>
      </div>
    </div>
  );
}
