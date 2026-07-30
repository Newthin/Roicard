/**
 * Onboarding page — /onboarding
 *
 * Public entry point for the guided membership journey. Unlike the dashboard,
 * this route is not auth-guarded because account creation happens inside the
 * flow itself.
 */

import { OnboardingJourney } from "@/components/onboarding/journey";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join Roicard",
};

export default function OnboardingPage() {
  return <OnboardingJourney />;
}
