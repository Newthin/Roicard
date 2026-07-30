/**
 * Per-step validation for the onboarding wizard.
 *
 * Returns a map of field names to error messages. An empty object means
 * the step is valid and the user can proceed to the next step.
 */

import type { OnboardingFormData } from "@/lib/profile/types";

export type FieldErrors = Record<string, string>;

/** Validates step 1 — first and last name are required. */
export function validateStep1(data: OnboardingFormData): FieldErrors {
  const errors: FieldErrors = {};

  if (!data.firstName.trim()) {
    errors.firstName = "First name is required";
  }

  if (!data.lastName.trim()) {
    errors.lastName = "Last name is required";
  }

  return errors;
}

/** Validates step 2 — professional title is required; photo is optional. */
export function validateStep2(data: OnboardingFormData): FieldErrors {
  const errors: FieldErrors = {};

  if (!data.professionalTitle.trim()) {
    errors.professionalTitle = "Professional title is required";
  }

  return errors;
}

/** Validates step 3 — bio must be at least 20 characters. */
export function validateStep3(data: OnboardingFormData): FieldErrors {
  const errors: FieldErrors = {};

  if (!data.bio.trim()) {
    errors.bio = "Bio is required";
  } else if (data.bio.trim().length < 20) {
    errors.bio = "Bio must be at least 20 characters";
  }

  return errors;
}

/** Validates step 4 — email is required and must look valid. */
export function validateStep4(data: OnboardingFormData): FieldErrors {
  const errors: FieldErrors = {};

  if (!data.email.trim()) {
    errors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = "Please enter a valid email address";
  }

  return errors;
}

/** Validates step 5 — location is required. */
export function validateStep5(data: OnboardingFormData): FieldErrors {
  const errors: FieldErrors = {};

  if (!data.location.trim()) {
    errors.location = "Location is required";
  }

  return errors;
}

/** Step 6 (social links) — all fields optional, no validation needed. */
export function validateStep6(): FieldErrors {
  return {};
}

/** Runs validation for a given step number (1–6). Step 7 is review-only. */
export function validateStep(
  step: number,
  data: OnboardingFormData
): FieldErrors {
  switch (step) {
    case 1:
      return validateStep1(data);
    case 2:
      return validateStep2(data);
    case 3:
      return validateStep3(data);
    case 4:
      return validateStep4(data);
    case 5:
      return validateStep5(data);
    case 6:
      return validateStep6();
    default:
      return {};
  }
}
