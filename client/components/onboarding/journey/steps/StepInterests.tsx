/**
 * Step 04 — Interests
 *
 * Lets members select areas of interest so their experience can be tailored.
 * Requires at least one selection before continuing.
 */

"use client";

import { useJourney } from "@/components/onboarding/journey/JourneyContext";
import { StepHeading } from "@/components/onboarding/journey/StepHeading";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { INTEREST_OPTIONS } from "@/lib/profile/types";
import { Check } from "lucide-react";

export function StepInterests() {
  const { data, errors, toggleInterest, next } = useJourney();

  return (
    <div className="space-y-7">
      <StepHeading
        eyebrow="Interests"
        title="What are you interested in?"
        description="Pick the areas that matter to you. We'll use these to personalize your community experience."
      />

      <div className="flex flex-wrap gap-2.5">
        {INTEREST_OPTIONS.map((interest) => {
          const selected = data.interests.includes(interest);
          return (
            <button
              key={interest}
              type="button"
              aria-pressed={selected}
              onClick={() => toggleInterest(interest)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-all",
                selected
                  ? "border-transparent roicard-gradient text-roicard-on-primary shadow-sm"
                  : "border-roicard-border bg-roicard-bg-elevated text-roicard-text hover:border-roicard-accent/50"
              )}
            >
              {selected && <Check className="h-4 w-4" />}
              {interest}
            </button>
          );
        })}
      </div>

      {errors.interests && (
        <p className="text-sm text-red-400" role="alert">
          {errors.interests}
        </p>
      )}

      <Button onClick={next} className="w-full rounded-xl">
        Continue
      </Button>
    </div>
  );
}
