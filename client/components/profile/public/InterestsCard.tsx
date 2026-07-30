/**
 * InterestsCard
 *
 * Displays the member's selected interest areas as chips. Hidden when no
 * interests were chosen. Uses the shared ProfileCard shell.
 *
 * Props:
 * - interests: list of interest labels from onboarding
 */

import { ProfileCard } from "@/components/profile/public/ProfileCard";
import { Heart } from "lucide-react";

type InterestsCardProps = {
  interests: string[];
};

export function InterestsCard({ interests }: InterestsCardProps) {
  if (!interests || interests.length === 0) return null;

  return (
    <ProfileCard>
      <div className="px-5 pt-4">
        <span className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-roicard-primary/10 text-roicard-accent">
            <Heart className="h-4 w-4" aria-hidden />
          </span>
          <span className="text-sm font-semibold text-roicard-text">
          Professional Interests
          </span>
        </span>
      </div>

      <div className="flex flex-wrap gap-2 px-5 pb-5 pt-4">
        {interests.map((interest) => (
          <span
            key={interest}
            className="rounded-full border border-roicard-border/60 bg-roicard-bg-muted/50 px-3 py-1.5 text-xs font-medium text-roicard-text"
          >
            {interest}
          </span>
        ))}
      </div>
    </ProfileCard>
  );
}
