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

export function StepContact() {
  const { data, updateField, updateSocial, next } = useJourney();

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
          <FormField
            label="LinkedIn"
            name="linkedin"
            placeholder="linkedin.com/in/username"
            value={data.social.linkedin}
            onChange={(e) => updateSocial("linkedin", e.target.value)}
          />
          <FormField
            label="Instagram"
            name="instagram"
            placeholder="instagram.com/username"
            value={data.social.instagram}
            onChange={(e) => updateSocial("instagram", e.target.value)}
          />
          <FormField
            label="X / Twitter"
            name="twitter"
            placeholder="x.com/username"
            value={data.social.twitter}
            onChange={(e) => updateSocial("twitter", e.target.value)}
          />
          <FormField
            label="Facebook"
            name="facebook"
            placeholder="facebook.com/username"
            value={data.social.facebook}
            onChange={(e) => updateSocial("facebook", e.target.value)}
          />
          <FormField
            label="TikTok"
            name="tiktok"
            placeholder="tiktok.com/@username"
            value={data.social.tiktok}
            onChange={(e) => updateSocial("tiktok", e.target.value)}
          />
          <FormField
            label="Snapchat"
            name="snapchat"
            placeholder="snapchat.com/add/username"
            value={data.social.snapchat}
            onChange={(e) => updateSocial("snapchat", e.target.value)}
          />
        </div>
        <FormField
          label="Website"
          name="website"
          placeholder="yourwebsite.com"
          value={data.social.website}
          onChange={(e) => updateSocial("website", e.target.value)}
        />
      </div>

      <Button onClick={next} className="w-full rounded-xl">
        Continue
      </Button>
    </div>
  );
}
