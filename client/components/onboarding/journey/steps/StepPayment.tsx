/**
 * Step 06 — Payment
 *
 * Mock payment method selection for members who chose to activate now.
 * A "pay later" escape hatch keeps payment fully optional.
 */

"use client";

import { useJourney } from "@/components/onboarding/journey/JourneyContext";
import { StepHeading } from "@/components/onboarding/journey/StepHeading";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { MEMBERSHIP_FEE_GHS, PAYMENT_METHODS } from "@/lib/profile/types";
import { useState } from "react";

export function StepPayment() {
  const { submitPayment, skipMembership } = useJourney();
  const [method, setMethod] = useState<string>(PAYMENT_METHODS[0].id);

  return (
    <div className="space-y-7">
      <StepHeading
        eyebrow="Payment"
        title="Choose a payment method"
        description="Select how you'd like to complete your one-time membership activation."
      />

      <div className="space-y-3">
        {PAYMENT_METHODS.map((option) => {
          const selected = method === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setMethod(option.id)}
              aria-pressed={selected}
              className={cn(
                "flex w-full items-center justify-between rounded-xl border px-4 py-4 text-left transition-all",
                selected
                  ? "border-roicard-accent bg-roicard-accent/5"
                  : "border-roicard-border bg-roicard-bg-elevated hover:border-roicard-accent/40"
              )}
            >
              <span className="text-sm font-medium text-roicard-text">
                {option.label}
              </span>
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full border-2",
                  selected
                    ? "border-roicard-accent"
                    : "border-roicard-border"
                )}
              >
                {selected && (
                  <span className="h-2.5 w-2.5 rounded-full bg-roicard-accent" />
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3">
        <Button onClick={submitPayment} className="w-full rounded-xl">
          Pay GHS {MEMBERSHIP_FEE_GHS}
        </Button>
        <button
          type="button"
          onClick={skipMembership}
          className="text-center text-sm font-medium text-roicard-text-muted transition-colors hover:text-roicard-text"
        >
          Pay later instead
        </button>
      </div>
    </div>
  );
}
