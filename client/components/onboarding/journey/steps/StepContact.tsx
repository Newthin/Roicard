/**
 * Step 03 — Contact & Social
 *
 * Optional ways for the community to reach the member: phone, WhatsApp, and
 * social links. Everything here is optional and editable later.
 */

"use client";

import { FormField } from "@/components/onboarding/FormField";
import { useJourney } from "@/components/onboarding/journey/JourneyContext";
import { StepHeading } from "@/components/onboarding/journey/StepHeading";
import { Button } from "@/components/ui/Button";
import { Plus } from "lucide-react";
import { useState } from "react";

const DEFAULT_SOCIALS = [
  { key: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/in/username" },
  { key: "instagram", label: "Instagram", placeholder: "instagram.com/username" },
  { key: "twitter", label: "X / Twitter", placeholder: "x.com/username" },
  { key: "website", label: "Website", placeholder: "yourwebsite.com" },
] as const;

const MORE_SOCIALS = [
  { key: "facebook", label: "Facebook", placeholder: "facebook.com/username" },
  { key: "tiktok", label: "TikTok", placeholder: "tiktok.com/@username" },
  { key: "snapchat", label: "Snapchat", placeholder: "snapchat.com/add/username" },
] as const;

export function StepContact() {
  const { data, updateField, updateSocial, next } = useJourney();
  const [showMore, setShowMore] = useState(false);

  return (
    <div className="space-y-7">
      <StepHeading
        eyebrow="Contact & social"
        title="How can people reach you?"
        description="Add the contact details and social links you'd like on your profile. These are optional — you can update them anytime."
      />

      {/* Contact */}
      <div className="space-y-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-roicard-text-muted">
          Contact
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            label="Phone Number"
            name="phone"
            type="tel"
            placeholder="+233 20 000 0000"
            autoComplete="tel"
            hint="Optional"
            value={data.phone}
            onChange={(e) => updateField("phone", e.target.value)}
          />
          <FormField
            label="WhatsApp Number"
            name="whatsapp"
            type="tel"
            placeholder="+233 20 000 0000"
            hint="Optional"
            value={data.whatsapp}
            onChange={(e) => updateField("whatsapp", e.target.value)}
          />
        </div>
      </div>

      <div className="h-px bg-roicard-border" />

      {/* Social */}
      <div className="space-y-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-roicard-text-muted">
          Social links
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          {DEFAULT_SOCIALS.map(({ key, label, placeholder }) => (
            <FormField
              key={key}
              label={label}
              name={key}
              placeholder={placeholder}
              value={data.social[key]}
              onChange={(e) => updateSocial(key, e.target.value)}
            />
          ))}
          {showMore &&
            MORE_SOCIALS.map(({ key, label, placeholder }) => (
              <FormField
                key={key}
                label={label}
                name={key}
                placeholder={placeholder}
                value={data.social[key]}
                onChange={(e) => updateSocial(key, e.target.value)}
              />
            ))}
        </div>

        <button
          type="button"
          onClick={() => setShowMore((prev) => !prev)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-roicard-accent transition-colors hover:text-roicard-text"
        >
          {showMore ? (
            "Show fewer"
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Add more
            </>
          )}
        </button>
      </div>

      <Button onClick={next} className="w-full rounded-xl">
        Continue
      </Button>
    </div>
  );
}
