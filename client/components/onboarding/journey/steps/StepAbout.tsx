/**
 * Step 01 — Tell us about yourself
 *
 * Collects the member's personal information (name + email). Kept separate from
 * the professional identity step so the journey feels gradual.
 */

"use client";

import { FormField } from "@/components/onboarding/FormField";
import { useJourney } from "@/components/onboarding/journey/JourneyContext";
import { StepHeading } from "@/components/onboarding/journey/StepHeading";
import { Button } from "@/components/ui/Button";

export function StepAbout() {
  const { data, errors, updateField, next } = useJourney();

  return (
    <div className="space-y-7">
      <StepHeading
        eyebrow="Get started"
        title="Tell us about yourself"
        description="Let's start with the basics so we can personalize your Roicard experience."
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          label="First Name"
          name="firstName"
          placeholder="Emmanuel"
          autoComplete="given-name"
          value={data.firstName}
          onChange={(e) => updateField("firstName", e.target.value)}
          error={errors.firstName}
        />
        <FormField
          label="Last Name"
          name="lastName"
          placeholder="Winso"
          autoComplete="family-name"
          value={data.lastName}
          onChange={(e) => updateField("lastName", e.target.value)}
          error={errors.lastName}
        />
      </div>

      <FormField
        label="Email Address"
        name="email"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        value={data.email}
        onChange={(e) => updateField("email", e.target.value)}
        error={errors.email}
      />

      <Button onClick={next} className="w-full rounded-xl">
        Continue
      </Button>
    </div>
  );
}
