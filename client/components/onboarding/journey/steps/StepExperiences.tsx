/**
 * Step 07 — Add Experiences Later
 *
 * Reassures members they can grow their profile over time. CV uploads are out
 * of MVP1; members add experiences/achievements/projects later.
 */

"use client";

import { useJourney } from "@/components/onboarding/journey/JourneyContext";
import { StepHeading } from "@/components/onboarding/journey/StepHeading";
import { Button } from "@/components/ui/Button";
import { Award, Briefcase, FolderKanban, Star } from "lucide-react";

const FUTURE_ITEMS = [
  { icon: Briefcase, label: "Experiences" },
  { icon: Award, label: "Achievements" },
  { icon: FolderKanban, label: "Projects" },
  { icon: Star, label: "Professional Highlights" },
];

export function StepExperiences() {
  const { next } = useJourney();

  return (
    <div className="space-y-8 text-center">
      <StepHeading
        centered
        eyebrow="Your profile grows with you"
        title="Build your profile over time"
        description="You can always add experiences, achievements, projects, and professional highlights later from your dashboard."
      />

      <div className="grid grid-cols-2 gap-4">
        {FUTURE_ITEMS.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-2 rounded-2xl border border-roicard-border bg-roicard-bg-elevated/70 p-5 theme-transition"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-roicard-primary/10 text-roicard-accent">
              <Icon className="h-5 w-5" />
            </span>
            <span className="text-sm font-medium text-roicard-text">
              {label}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <Button onClick={next} className="w-full rounded-xl">
          Continue
        </Button>
        <button
          type="button"
          onClick={next}
          className="text-sm font-medium text-roicard-text-muted transition-colors hover:text-roicard-text"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
