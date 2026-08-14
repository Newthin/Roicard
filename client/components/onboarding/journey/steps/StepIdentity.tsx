/**
 * Step 02 — Professional Identity
 *
 * Foundation of the member's public profile: photo, headline, short bio,
 * university/company, and location. Shows a live profile URL preview.
 */

"use client";

import { FormField } from "@/components/onboarding/FormField";
import { useJourney } from "@/components/onboarding/journey/JourneyContext";
import { StepHeading } from "@/components/onboarding/journey/StepHeading";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { getPublicProfileUrl } from "@/lib/profile/username";
import { Camera, Upload } from "lucide-react";
import { ChangeEvent } from "react";

export function StepIdentity() {
  const { data, errors, updateField, username, next } = useJourney();

  /** Reads a selected image into a data URL for local preview (no upload). */
  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateField("profilePhotoUrl", reader.result as string);
    reader.readAsDataURL(file);
  };

  const initials = [data.firstName, data.lastName]
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-7">
      <StepHeading
        eyebrow="Professional identity"
        title="Build Your Professional Identity."
        description="The foundation of your public profile — refine it anytime from your dashboard."
      />

      {/* Profile photo */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-roicard-text">Profile Photo</p>
        <div className="flex items-center gap-5">
          {data.profilePhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.profilePhotoUrl}
              alt="Profile"
              className="h-20 w-20 rounded-full border-2 border-roicard-border object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-roicard-border bg-roicard-bg-muted text-lg font-bold text-roicard-text-muted">
              {initials || <Camera className="h-6 w-6" />}
            </div>
          )}

          <label
            className={cn(
              "inline-flex cursor-pointer items-center gap-2 rounded-xl border border-roicard-border",
              "bg-roicard-bg-muted px-4 py-2.5 text-sm font-medium text-roicard-text",
              "transition-colors hover:border-roicard-accent/50 hover:bg-roicard-bg-elevated",
            )}
          >
            <Upload className="h-4 w-4 text-roicard-accent" />
            Upload Photo
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handlePhotoChange}
            />
          </label>
        </div>
      </div>

      <FormField
        label="Professional Headline"
        name="professionalTitle"
        placeholder="Product Designer · Aspiring Entrepreneur"
        value={data.professionalTitle}
        onChange={(e) => updateField("professionalTitle", e.target.value)}
        error={errors.professionalTitle}
      />

      <FormField
        variant="textarea"
        label="Professional Profile"
        name="bio"
        placeholder="Tell the community a little about who you are and what you care about."
        value={data.bio}
        onChange={(e) => updateField("bio", e.target.value)}
        error={errors.bio}
      />

      <FormField
        label="Organisation / Institution"
        name="organization"
        placeholder="University of Ghana / Acme Inc."
        hint="Optional"
        value={data.organization}
        onChange={(e) => updateField("organization", e.target.value)}
      />

      <FormField
        label="Location"
        name="location"
        placeholder="Accra, Ghana"
        value={data.location}
        onChange={(e) => updateField("location", e.target.value)}
        error={errors.location}
      />

      {/* Profile URL preview */}
      <div className="rounded-xl border border-roicard-accent/20 bg-roicard-accent/5 px-4 py-3">
        <p className="text-xs uppercase tracking-wider text-roicard-text-muted">
          Your profile link
        </p>
        <p className="mt-1 break-all text-sm font-medium text-roicard-accent">
          {getPublicProfileUrl(username).replace(/^https?:\/\//, "")}
        </p>
      </div>

      <Button onClick={next} className="w-full rounded-xl">
        Continue
      </Button>
    </div>
  );
}
