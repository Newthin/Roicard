/**
 * Onboarding Journey context.
 *
 * Drives the guided 13-step membership journey. Holds all collected data in
 * memory, manages step navigation (including the optional/skippable payment
 * branch), and finalizes the profile on completion.
 *
 * Payment is intentionally OPTIONAL: members can skip activation and pay later
 * from their dashboard. Skipping jumps straight from Membership → Success with
 * a "pending" membership status.
 */

"use client";

import {
  createAndSaveProfile,
  setOnboardingComplete,
  getJourneyState,
  saveJourneyState,
  clearJourneyState,
  clearPaymentSnapshot,
} from "@/lib/profile/storage";
import {
  EMPTY_ONBOARDING_DATA,
  type MembershipStatus,
  type OnboardingFormData,
  type SocialLinks,
  type UserProfile,
} from "@/lib/profile/types";
import { generateUsername } from "@/lib/profile/username";
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/** All step identifiers in the journey. */
export type JourneyStepId =
  | "about"
  | "identity"
  | "contact"
  | "interests"
  | "membership"
  | "payment"
  | "processing"
  | "success"
  | "seeking"
  | "offering"
  | "experiences"
  | "review"
  | "complete";

/**
 * Linear order for generic next/back navigation. Payment + processing are
 * NOT included here — they are only reached when a member chooses to activate
 * membership, keeping payment fully optional. Payment/Success come last so the
 * member builds and reviews their profile before completing checkout.
 */
const LINEAR_STEPS: JourneyStepId[] = [
  "about",
  "identity",
  "contact",
  "interests",
  "seeking",
  "offering",
  "experiences",
  "review",
  "membership",
  "success",
  "complete",
];

/** Steps where a Back affordance should not be shown. */
const NO_BACK_STEPS: JourneyStepId[] = [
  "about",
  "payment",
  "processing",
  "success",
  "complete",
];

/** Journey form data (personal + professional + community fields). */
export type JourneyData = OnboardingFormData;

const EMPTY_JOURNEY_DATA: JourneyData = {
  ...EMPTY_ONBOARDING_DATA,
};

export type JourneyFieldErrors = Record<string, string>;

type JourneyContextValue = {
  step: JourneyStepId;
  stepIndex: number;
  totalSteps: number;
  progressPercent: number;
  canGoBack: boolean;
  data: JourneyData;
  errors: JourneyFieldErrors;
  membershipStatus: MembershipStatus;
  username: string;
  /** Updates a single top-level field and clears its error. */
  updateField: <K extends keyof JourneyData>(
    field: K,
    value: JourneyData[K]
  ) => void;
  /** Updates a single nested social link field. */
  updateSocial: (field: keyof SocialLinks, value: string) => void;
  /** Toggles an interest chip on/off. */
  toggleInterest: (interest: string) => void;
  /** Advances to the next linear step after validating the current one. */
  next: () => void;
  /** Returns to the previous linear step. */
  back: () => void;
  /** Jumps directly to a specific step (used for branching + edit-from-review). */
  goTo: (step: JourneyStepId) => void;
  /** Membership → Payment branch (member chose to activate now). */
  activateMembership: () => void;
  /** Membership → Success branch (member chose to pay later). */
  skipMembership: () => void;
  /** Payment → Processing (mock). */
  submitPayment: () => void;
  /** Processing → Success, marking membership active. */
  finishProcessing: () => void;
  /** Finalizes the journey: saves profile, logs in, marks complete. */
  complete: () => string;
};

const JourneyContext = createContext<JourneyContextValue | null>(null);

export function useJourney() {
  const ctx = useContext(JourneyContext);
  if (!ctx) {
    throw new Error("useJourney must be used within OnboardingJourneyProvider");
  }
  return ctx;
}

/** Validates a step's required fields; empty result means the step is valid. */
function validateStep(step: JourneyStepId, data: JourneyData): JourneyFieldErrors {
  const errors: JourneyFieldErrors = {};

  if (step === "about") {
    if (!data.firstName.trim()) errors.firstName = "First name is required";
    if (!data.lastName.trim()) errors.lastName = "Last name is required";
    if (!data.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = "Please enter a valid email address";
    }
    if (data.dateOfBirth) {
      const dob = new Date(`${data.dateOfBirth}T00:00:00`);
      if (isNaN(dob.getTime()) || dob >= new Date()) {
        errors.dateOfBirth = "Please enter a valid date in the past";
      }
    }
  }

  if (step === "identity") {
    if (!data.professionalTitle.trim()) {
      errors.professionalTitle = "Professional headline is required";
    }
    if (!data.bio.trim()) {
      errors.bio = "A short bio helps people understand you";
    }
    if (!data.location.trim()) {
      errors.location = "Location is required";
    }
  }

  if (step === "interests") {
    if (data.interests.length === 0) {
      errors.interests = "Select at least one area of interest";
    }
  }

  return errors;
}

type ProviderProps = { children: ReactNode };

export function OnboardingJourneyProvider({ children }: ProviderProps) {
  const [step, setStep] = useState<JourneyStepId>("about");
  const [data, setData] = useState<JourneyData>(EMPTY_JOURNEY_DATA);
  const [errors, setErrors] = useState<JourneyFieldErrors>({});
  const [membershipStatus, setMembershipStatusState] =
    useState<MembershipStatus>("pending");
  const [hydrated, setHydrated] = useState(false);

  // Restore a previously persisted journey (e.g. after a payment redirect) once
  // the client mounts, so SSR and hydration render the same initial state.
  useEffect(() => {
    const saved = getJourneyState();
    if (saved) {
      setStep((saved.step as JourneyStepId) ?? "about");
      setData(saved.data ?? EMPTY_JOURNEY_DATA);
      setMembershipStatusState(saved.membershipStatus ?? "pending");
    }
    setHydrated(true);
  }, []);

  // Persist journey position + data so a refresh or provider redirect resumes
  // the exact step the member left off at. Gated on hydration so the persisted
  // state is never clobbered by the default (empty) initial state.
  useEffect(() => {
    if (!hydrated) return;
    saveJourneyState({ step, data, membershipStatus });
  }, [hydrated, step, data, membershipStatus]);

  const username = useMemo(
    () => generateUsername(data.firstName || "your", data.lastName || "name"),
    [data.firstName, data.lastName]
  );

  const updateField = useCallback(
    <K extends keyof JourneyData>(field: K, value: JourneyData[K]) => {
      setData((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => {
        if (!prev[field as string]) return prev;
        const next = { ...prev };
        delete next[field as string];
        return next;
      });
    },
    []
  );

  const updateSocial = useCallback(
    (field: keyof SocialLinks, value: string) => {
      setData((prev) => ({
        ...prev,
        social: { ...prev.social, [field]: value },
      }));
    },
    []
  );

  const toggleInterest = useCallback((interest: string) => {
    setData((prev) => {
      const has = prev.interests.includes(interest);
      return {
        ...prev,
        interests: has
          ? prev.interests.filter((i) => i !== interest)
          : [...prev.interests, interest],
      };
    });
    setErrors((prev) => {
      if (!prev.interests) return prev;
      const next = { ...prev };
      delete next.interests;
      return next;
    });
  }, []);

  const goTo = useCallback((target: JourneyStepId) => {
    setErrors({});
    setStep(target);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  const next = useCallback(() => {
    const stepErrors = validateStep(step, data);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    const idx = LINEAR_STEPS.indexOf(step);
    const nextStep = LINEAR_STEPS[Math.min(idx + 1, LINEAR_STEPS.length - 1)];
    goTo(nextStep);
  }, [step, data, goTo]);

  const back = useCallback(() => {
    const idx = LINEAR_STEPS.indexOf(step);
    // Steps off the linear path (payment/processing) fall back to membership.
    if (idx === -1) {
      goTo("membership");
      return;
    }
    const prevStep = LINEAR_STEPS[Math.max(idx - 1, 0)];
    goTo(prevStep);
  }, [step, goTo]);

  const activateMembership = useCallback(() => goTo("payment"), [goTo]);

  const skipMembership = useCallback(() => {
    setMembershipStatusState("pending");
    goTo("success");
  }, [goTo]);

  const submitPayment = useCallback(() => goTo("processing"), [goTo]);

  const finishProcessing = useCallback(() => {
    setMembershipStatusState("active");
    goTo("success");
  }, [goTo]);

  /** Persists the profile, signs the member in, and marks onboarding complete. */
  const complete = useCallback(() => {
    // Explicitly map to OnboardingFormData so the transient password is never
    // persisted into the stored profile.
    const profile: UserProfile = {
      firstName: data.firstName,
      lastName: data.lastName,
      profilePhotoUrl: data.profilePhotoUrl,
      professionalTitle: data.professionalTitle,
      roleDescription: data.roleDescription,
      organization: data.organization,
      bio: data.bio,
      email: data.email,
      phone: data.phone,
      whatsapp: data.whatsapp,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
      location: data.location,
      social: data.social,
      interests: data.interests,
      seeking: data.seeking,
      offering: data.offering,
      username,
      createdAt: new Date().toISOString(),
      membershipStatus,
    };
    createAndSaveProfile(profile);
    setOnboardingComplete();
    clearJourneyState();
    clearPaymentSnapshot();
    return profile.username;
  }, [data, membershipStatus, username]);

  // Payment + processing sit off the linear path; anchor their progress to the
  // membership step so the bar/counter never jumps backwards.
  const linearIndex = LINEAR_STEPS.indexOf(step);
  const stepIndex =
    linearIndex === -1 ? LINEAR_STEPS.indexOf("membership") : linearIndex;
  const totalSteps = LINEAR_STEPS.length;
  const progressPercent = Math.round(((stepIndex + 1) / totalSteps) * 100);
  const canGoBack = !NO_BACK_STEPS.includes(step);

  const value = useMemo<JourneyContextValue>(
    () => ({
      step,
      stepIndex,
      totalSteps,
      progressPercent,
      canGoBack,
      data,
      errors,
      membershipStatus,
      username,
      updateField,
      updateSocial,
      toggleInterest,
      next,
      back,
      goTo,
      activateMembership,
      skipMembership,
      submitPayment,
      finishProcessing,
      complete,
    }),
    [
      step,
      stepIndex,
      totalSteps,
      progressPercent,
      canGoBack,
      data,
      errors,
      membershipStatus,
      username,
      updateField,
      updateSocial,
      toggleInterest,
      next,
      back,
      goTo,
      activateMembership,
      skipMembership,
      submitPayment,
      finishProcessing,
      complete,
    ]
  );

  return (
    <JourneyContext.Provider value={value}>{children}</JourneyContext.Provider>
  );
}
