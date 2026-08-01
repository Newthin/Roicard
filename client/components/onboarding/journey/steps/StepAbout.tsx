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
import { GENDER_OPTIONS } from "@/lib/profile/types";

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
          placeholder="Moses"
          autoComplete="given-name"
          value={data.firstName}
          onChange={(e) => updateField("firstName", e.target.value)}
          error={errors.firstName}
        />
        <FormField
          label="Last Name"
          name="lastName"
          placeholder="Godsword"
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

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          label="Date of Birth"
          name="dateOfBirth"
          type="date"
          value={data.dateOfBirth}
          onChange={(e) => updateField("dateOfBirth", e.target.value)}
          error={errors.dateOfBirth}
        />
        <div className="w-full space-y-2">
          <label htmlFor="gender" className="block text-sm font-medium text-roicard-text">
            Gender
          </label>
          <select
            id="gender"
            name="gender"
            value={data.gender}
            onChange={(e) => updateField("gender", e.target.value as "male" | "female" | "prefer_not_to_say")}
            aria-invalid={Boolean(errors.gender)}
            className="h-12 w-full rounded-xl border bg-roicard-bg-muted/80 px-4 text-sm text-roicard-text shadow-inner shadow-[var(--rc-shadow)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-roicard-accent/40 focus-visible:border-roicard-accent/50"
          >
            <option value="">Select...</option>
            {GENDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.gender && (
            <p className="text-sm text-red-400" role="alert">
              {errors.gender}
            </p>
          )}
        </div>
      </div>

      <Button onClick={next} className="w-full rounded-xl">
        Continue
      </Button>
    </div>
  );
}
