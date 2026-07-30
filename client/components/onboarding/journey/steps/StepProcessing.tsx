/**
 * Step 07 — Processing
 *
 * Simulates payment confirmation, then automatically advances to Success and
 * marks the membership as active. Mock-only — replace with a real callback.
 */

"use client";

import { useJourney } from "@/components/onboarding/journey/JourneyContext";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

export function StepProcessing() {
  const { finishProcessing } = useJourney();

  useEffect(() => {
    const timer = setTimeout(finishProcessing, 2400);
    return () => clearTimeout(timer);
  }, [finishProcessing]);

  return (
    <div className="flex flex-col items-center gap-5 py-12 text-center">
      <Loader2 className="h-12 w-12 animate-spin text-roicard-accent" />
      <h1 className="text-xl font-semibold text-roicard-text">
        Processing your payment...
      </h1>
      <p className="max-w-sm text-sm text-roicard-text-muted">
        Please wait while we confirm your membership activation. This will only
        take a moment.
      </p>
    </div>
  );
}
