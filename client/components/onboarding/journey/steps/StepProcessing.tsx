/**
 * Step 11 — Processing
 *
 * Simulates payment confirmation, then automatically advances to Success and
 * marks the membership as active. Mock-only — replace with a real callback.
 */

"use client";

import { useJourney } from "@/components/onboarding/journey/JourneyContext";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

export function StepProcessing() {
  const { user } = useAuth();
  const { finishProcessing } = useJourney();

  useEffect(() => {
    const delay = user?.status === "active" ? 0 : 2400;
    const timer = setTimeout(finishProcessing, delay);
    return () => clearTimeout(timer);
  }, [finishProcessing, user]);

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
