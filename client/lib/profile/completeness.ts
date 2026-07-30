/**
 * Profile completeness utilities.
 *
 * Calculates how complete a user's ROICARD profile is for the dashboard hub.
 */

import type { OnboardingFormData } from "@/lib/profile/types";

export type ProfileCompletenessField = {
  key: string;
  label: string;
  complete: boolean;
};

export type ProfileCompleteness = {
  percent: number;
  completedCount: number;
  totalCount: number;
  missing: ProfileCompletenessField[];
};

const CHECKS: Array<{
  key: string;
  label: string;
  isComplete: (data: OnboardingFormData) => boolean;
}> = [
  { key: "name", label: "Full name", isComplete: (d) => !!(d.firstName && d.lastName) },
  { key: "photo", label: "Profile photo", isComplete: (d) => !!d.profilePhotoUrl },
  { key: "title", label: "Professional title", isComplete: (d) => !!d.professionalTitle.trim() },
  { key: "organization", label: "Organization", isComplete: (d) => !!d.organization.trim() },
  { key: "bio", label: "Bio", isComplete: (d) => !!d.bio.trim() },
  { key: "email", label: "Email", isComplete: (d) => !!d.email.trim() },
  { key: "phone", label: "Phone", isComplete: (d) => !!d.phone.trim() },
  { key: "whatsapp", label: "WhatsApp", isComplete: (d) => !!d.whatsapp.trim() },
  { key: "location", label: "Location", isComplete: (d) => !!d.location.trim() },
  {
    key: "social",
    label: "At least one social link",
    isComplete: (d) =>
      Object.values(d.social).some((url) => url.trim().length > 0),
  },
  {
    key: "interests",
    label: "Interests",
    isComplete: (d) => d.interests.length > 0,
  },
  { key: "seeking", label: "What you're seeking", isComplete: (d) => !!d.seeking.trim() },
  { key: "offering", label: "What you can offer", isComplete: (d) => !!d.offering.trim() },
];

/** Returns completion percentage and list of missing items. */
export function getProfileCompleteness(
  data: OnboardingFormData
): ProfileCompleteness {
  const fields: ProfileCompletenessField[] = CHECKS.map((check) => ({
    key: check.key,
    label: check.label,
    complete: check.isComplete(data),
  }));

  const completedCount = fields.filter((f) => f.complete).length;
  const totalCount = fields.length;
  const percent = Math.round((completedCount / totalCount) * 100);

  return {
    percent,
    completedCount,
    totalCount,
    missing: fields.filter((f) => !f.complete),
  };
}
