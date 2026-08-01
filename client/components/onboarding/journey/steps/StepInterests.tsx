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
import { useInterestOptions } from "@/hooks/useInterestOptions";
import { Check, Plus } from "lucide-react";
import { useState } from "react";

export function StepInterests() {
  const { data, errors, toggleInterest, next } = useJourney();
  const [customInterest, setCustomInterest] = useState("");
  const interestOptions = useInterestOptions();

  const handleAddCustom = () => {
    const value = customInterest.trim();
    if (!value) return;
    if (data.interests.some((i) => i.toLowerCase() === value.toLowerCase())) {
      setCustomInterest("");
      return;
    }
    toggleInterest(value);
    setCustomInterest("");
  };

  return (
    <div className="space-y-7">
      <StepHeading
        eyebrow="Interests"
        title="What are you interested in?"
        description="Pick the areas that matter to you or add your own. We'll use these to personalize your community experience."
      />

      <div className="flex flex-wrap gap-2.5">
        {interestOptions.map((interest) => {
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

        {/* Custom interests added by the user */}
        {data.interests
          .filter((i) => !interestOptions.includes(i))
          .map((interest) => {
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
                    : "border-roicard-accent/50 bg-roicard-accent/5 text-roicard-text hover:border-roicard-accent"
                )}
              >
                {selected && <Check className="h-4 w-4" />}
                {interest}
              </button>
            );
          })}
      </div>

      {/* Custom interest input */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={customInterest}
          onChange={(e) => setCustomInterest(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddCustom();
            }
          }}
          placeholder="Type a custom interest..."
          className="h-12 w-full rounded-xl border border-roicard-border bg-roicard-bg-muted/80 px-4 text-sm text-roicard-text placeholder:text-roicard-text-muted/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-roicard-accent/40 focus-visible:border-roicard-accent/50"
        />
        <Button
          type="button"
          variant="secondary"
          onClick={handleAddCustom}
          className="shrink-0 rounded-xl"
        >
          <Plus className="h-4 w-4" />
          Add
        </Button>
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
