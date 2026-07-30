/**
 * OnboardingJourney
 *
 * Top-level orchestrator for the guided membership journey. Wires the journey
 * provider and layout together and renders the active step. Payment steps are
 * only reached when a member chooses to activate membership.
 */

"use client";

import {
  OnboardingJourneyProvider,
  useJourney,
} from "@/components/onboarding/journey/JourneyContext";
import { JourneyLayout } from "@/components/onboarding/journey/JourneyLayout";
import { StepAbout } from "@/components/onboarding/journey/steps/StepAbout";
import { StepComplete } from "@/components/onboarding/journey/steps/StepComplete";
import { StepContact } from "@/components/onboarding/journey/steps/StepContact";
import { StepExperiences } from "@/components/onboarding/journey/steps/StepExperiences";
import { StepIdentity } from "@/components/onboarding/journey/steps/StepIdentity";
import { StepInterests } from "@/components/onboarding/journey/steps/StepInterests";
import { StepMembership } from "@/components/onboarding/journey/steps/StepMembership";
import { StepOffering } from "@/components/onboarding/journey/steps/StepOffering";
import { StepPayment } from "@/components/onboarding/journey/steps/StepPayment";
import { StepProcessing } from "@/components/onboarding/journey/steps/StepProcessing";
import { StepReview } from "@/components/onboarding/journey/steps/StepReview";
import { StepSeeking } from "@/components/onboarding/journey/steps/StepSeeking";
import { StepSuccess } from "@/components/onboarding/journey/steps/StepSuccess";

/** Renders the active step component based on journey state. */
function ActiveStep() {
  const { step } = useJourney();

  switch (step) {
    case "about":
      return <StepAbout />;
    case "identity":
      return <StepIdentity />;
    case "contact":
      return <StepContact />;
    case "interests":
      return <StepInterests />;
    case "membership":
      return <StepMembership />;
    case "payment":
      return <StepPayment />;
    case "processing":
      return <StepProcessing />;
    case "success":
      return <StepSuccess />;
    case "seeking":
      return <StepSeeking />;
    case "offering":
      return <StepOffering />;
    case "experiences":
      return <StepExperiences />;
    case "review":
      return <StepReview />;
    case "complete":
      return <StepComplete />;
    default:
      return <StepAbout />;
  }
}

export function OnboardingJourney() {
  return (
    <OnboardingJourneyProvider>
      <JourneyLayout>
        <ActiveStep />
      </JourneyLayout>
    </OnboardingJourneyProvider>
  );
}
