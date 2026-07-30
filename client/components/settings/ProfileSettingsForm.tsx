/**
 * ProfileSettingsForm
 *
 * Editable profile fields — photo, identity, bio, location, social links.
 * Saves to mock localStorage via updateCurrentUserProfile().
 */

"use client";

import { FormField } from "@/components/onboarding/FormField";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { getPersonInitials } from "@/lib/connections/helpers";
import type { ConnectionPerson } from "@/lib/connections/types";
import {
  EMPTY_ONBOARDING_DATA,
  INTEREST_OPTIONS,
  type OnboardingFormData,
  type SocialLinks,
} from "@/lib/profile/types";
import { updateCurrentUserProfile } from "@/lib/profile/storage";
import { cn } from "@/lib/cn";
import { Camera, Check, Upload } from "lucide-react";
import { ChangeEvent, useEffect, useState } from "react";

type ProfileSettingsFormProps = {
  initialData: OnboardingFormData;
  onSaved?: () => void;
};

export function ProfileSettingsForm({
  initialData,
  onSaved,
}: ProfileSettingsFormProps) {
  const { confirm } = useConfirm();
  const [form, setForm] = useState<OnboardingFormData>(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    setForm(initialData);
  }, [initialData]);

  const updateField = <K extends keyof OnboardingFormData>(
    field: K,
    value: OnboardingFormData[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSavedMessage(null);
  };

  const updateSocial = (field: keyof SocialLinks, value: string) => {
    setForm((prev) => ({
      ...prev,
      social: { ...prev.social, [field]: value },
    }));
    setSavedMessage(null);
  };

  const toggleInterest = (interest: string) => {
    setForm((prev) => {
      const has = prev.interests.includes(interest);
      return {
        ...prev,
        interests: has
          ? prev.interests.filter((i) => i !== interest)
          : [...prev.interests, interest],
      };
    });
    setSavedMessage(null);
  };

  /** UI-only photo upload — stores base64 preview in form state. */
  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateField("profilePhotoUrl", reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleReset = async () => {
    const confirmed = await confirm({
      title: "Discard changes?",
      description: "Your unsaved profile edits will be lost.",
      confirmLabel: "Discard",
      variant: "danger",
    });

    if (!confirmed) return;
    setForm(initialData);
    setSavedMessage(null);
  };

  /** Persists profile changes via API. */
  const handleSave = async () => {
    const confirmed = await confirm({
      title: "Save profile changes?",
      description: "Your public profile and settings will be updated.",
      confirmLabel: "Save Changes",
    });

    if (!confirmed) return;

    setIsSaving(true);
    try {
      await updateCurrentUserProfile(form);
      setSavedMessage("Profile saved successfully.");
      onSaved?.();
    } catch {
      setSavedMessage("Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const personForInitials: ConnectionPerson = {
    id: "settings",
    firstName: form.firstName,
    lastName: form.lastName,
    profilePhotoUrl: form.profilePhotoUrl,
    professionalTitle: form.professionalTitle,
    organization: form.organization,
  };

  return (
    <SettingsSection
      title="Profile Settings"
      description="Update your public ROICARD identity and how others see you."
    >
      {/* Profile photo upload placeholder */}
      <div className="mb-6 space-y-2">
        <p className="text-sm font-medium text-roicard-text">Profile Photo</p>
        <div className="flex items-center gap-5">
          {form.profilePhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={form.profilePhotoUrl}
              alt="Profile"
              className="h-20 w-20 rounded-xl border border-roicard-border object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-dashed border-roicard-border bg-roicard-bg-muted text-lg font-bold text-roicard-text-muted">
              {form.firstName || form.lastName ? (
                getPersonInitials(personForInitials)
              ) : (
                <Camera className="h-6 w-6" />
              )}
            </div>
          )}
          <label
            className={cn(
              "inline-flex cursor-pointer items-center gap-2 rounded-xl border border-roicard-border",
              "bg-roicard-bg-muted px-4 py-2.5 text-sm font-medium text-roicard-text",
              "hover:border-roicard-accent/50 hover:bg-roicard-bg-elevated"
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

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          label="First Name"
          value={form.firstName}
          onChange={(e) => updateField("firstName", e.target.value)}
        />
        <FormField
          label="Last Name"
          value={form.lastName}
          onChange={(e) => updateField("lastName", e.target.value)}
        />
        <FormField
          label="Professional Title"
          value={form.professionalTitle}
          onChange={(e) => updateField("professionalTitle", e.target.value)}
        />
        <FormField
          label="Organization"
          value={form.organization}
          onChange={(e) => updateField("organization", e.target.value)}
        />
        <div className="sm:col-span-2">
          <FormField
            variant="textarea"
            label="Bio"
            value={form.bio}
            onChange={(e) => updateField("bio", e.target.value)}
          />
        </div>
      </div>

      <div className="mt-8 border-t border-roicard-border pt-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-roicard-accent">
          Contact
        </h3>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
          />
          <FormField
            label="Phone"
            type="tel"
            value={form.phone}
            onChange={(e) => updateField("phone", e.target.value)}
          />
          <FormField
            label="WhatsApp"
            type="tel"
            value={form.whatsapp}
            hint="Shown on your public card for quick messaging"
            onChange={(e) => updateField("whatsapp", e.target.value)}
          />
          <FormField
            label="Location"
            value={form.location}
            onChange={(e) => updateField("location", e.target.value)}
          />
        </div>
      </div>

      <div className="mt-8 border-t border-roicard-border pt-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-roicard-accent">
          Social Links
        </h3>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            label="LinkedIn"
            type="url"
            value={form.social.linkedin}
            onChange={(e) => updateSocial("linkedin", e.target.value)}
          />
          <FormField
            label="Instagram"
            type="url"
            value={form.social.instagram}
            onChange={(e) => updateSocial("instagram", e.target.value)}
          />
          <FormField
            label="X (Twitter)"
            type="url"
            value={form.social.twitter}
            onChange={(e) => updateSocial("twitter", e.target.value)}
          />
          <FormField
            label="Facebook"
            type="url"
            value={form.social.facebook}
            onChange={(e) => updateSocial("facebook", e.target.value)}
          />
          <FormField
            label="TikTok"
            type="url"
            value={form.social.tiktok}
            onChange={(e) => updateSocial("tiktok", e.target.value)}
          />
          <FormField
            label="Snapchat"
            type="url"
            value={form.social.snapchat}
            onChange={(e) => updateSocial("snapchat", e.target.value)}
          />
          <FormField
            label="Website"
            type="url"
            value={form.social.website}
            onChange={(e) => updateSocial("website", e.target.value)}
          />
        </div>
      </div>

      <div className="mt-8 border-t border-roicard-border pt-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-roicard-accent">
          Community
        </h3>

        <div className="space-y-2">
          <p className="text-sm font-medium text-roicard-text">Interests</p>
          <div className="flex flex-wrap gap-2">
            {INTEREST_OPTIONS.map((interest) => {
              const selected = form.interests.includes(interest);
              return (
                <button
                  key={interest}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleInterest(interest)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-all",
                    selected
                      ? "border-transparent roicard-gradient text-roicard-on-primary"
                      : "border-roicard-border bg-roicard-bg-muted text-roicard-text hover:border-roicard-accent/50"
                  )}
                >
                  {selected && <Check className="h-3.5 w-3.5" />}
                  {interest}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 grid gap-5">
          <FormField
            variant="textarea"
            label="What you're seeking"
            hint="Opportunities you're looking for from the community"
            value={form.seeking}
            onChange={(e) => updateField("seeking", e.target.value)}
          />
          <FormField
            variant="textarea"
            label="What you can offer"
            hint="Value, skills, or opportunities you can provide others"
            value={form.offering}
            onChange={(e) => updateField("offering", e.target.value)}
          />
        </div>
      </div>

      {savedMessage && (
        <p className="mt-4 text-sm text-emerald-400" role="status">
          {savedMessage}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button
          onClick={handleSave}
          isLoading={isSaving}
          className="rounded-xl sm:min-w-[160px]"
        >
          Save Changes
        </Button>
        <Button
          variant="secondary"
          onClick={handleReset}
          className="rounded-xl sm:min-w-[120px]"
        >
          Reset
        </Button>
      </div>
    </SettingsSection>
  );
}

/** Default profile form data when user has no saved profile. */
export function getDefaultProfileFormData(): OnboardingFormData {
  return { ...EMPTY_ONBOARDING_DATA };
}
