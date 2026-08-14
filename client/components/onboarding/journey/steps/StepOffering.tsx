/**
 * Step 06 — Offering
 *
 * Lets members share the value, skills, or opportunities they can offer others.
 * Optional — can be updated later.
 */

"use client";

import { FormField } from "@/components/onboarding/FormField";
import { useJourney } from "@/components/onboarding/journey/JourneyContext";
import { StepHeading } from "@/components/onboarding/journey/StepHeading";
import { Button } from "@/components/ui/Button";
import { Info } from "lucide-react";

export function StepOffering() {
  const { data, updateField, next } = useJourney();

  return (
    <div className="space-y-7">
      <StepHeading
        eyebrow="Offering"
        title="What can you offer others?"
        description="Share what you can offer the community."
      />

      <FormField
        variant="textarea"
        label="What you can offer"
        name="offering"
        placeholder="I offer graphic design services, content creation support, and mentorship for students interested in technology and entrepreneurship."
        value={data.offering}
        onChange={(e) => updateField("offering", e.target.value)}
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
