/**
 * Step 05 — Seeking
 *
 * Lets members express what opportunities they're looking for so the community
 * understands how to support them. Optional — can be updated later.
 */

"use client";

import { FormField } from "@/components/onboarding/FormField";
import { useJourney } from "@/components/onboarding/journey/JourneyContext";
import { StepHeading } from "@/components/onboarding/journey/StepHeading";
import { Button } from "@/components/ui/Button";
import { Info } from "lucide-react";

export function StepSeeking() {
  const { data, updateField, next } = useJourney();

  return (
    <div className="space-y-7">
      <StepHeading
        eyebrow="Seeking"
        title="What opportunities are you seeking?"
        description="Help the community understand how they can support you."
      />

      <FormField
        variant="textarea"
        label="What you're seeking"
        name="seeking"
        placeholder="I'm looking for internship opportunities in technology, mentorship from experienced entrepreneurs, and opportunities to collaborate on meaningful projects."
        value={data.seeking}
        onChange={(e) => updateField("seeking", e.target.value)}
      />

      <div className="flex items-start gap-2 rounded-lg border border-roicard-border bg-roicard-bg-muted/30 px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-roicard-text-muted" />
        <p className="text-xs leading-relaxed text-roicard-text-muted">
          You can update this anytime from your dashboard.
        </p>
      </div>

      <Button onClick={next} className="w-full rounded-xl">
        Continue
      </Button>
    </div>
  );
}
