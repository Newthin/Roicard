/**
 * Step 10 — Payment
 *
 * Real payment method selection for members who chose to activate now.
 * Submits a payment to the backend, persists the journey snapshot, and
 * redirects to the payment provider (Paystack) to complete checkout.
 * A "pay later" escape hatch keeps payment fully optional.
 * Active users skip this step automatically.
 */

"use client";

import { useJourney } from "@/components/onboarding/journey/JourneyContext";
import { StepHeading } from "@/components/onboarding/journey/StepHeading";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/cn";
import { initiatePayment } from "@/lib/api/payments";
import { savePaymentSnapshot } from "@/lib/profile/storage";
import { MEMBERSHIP_FEE_GHS, PAYMENT_METHODS } from "@/lib/profile/types";
import { useEffect, useRef, useState } from "react";

export function StepPayment() {
  const { user } = useAuth();
  const { data, submitPayment, skipMembership } = useJourney();
  const [method, setMethod] = useState<string>(PAYMENT_METHODS[0].id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (redirectedRef.current) return;
    if (user?.status === "active") {
      redirectedRef.current = true;
      submitPayment();
    }
  }, [user, submitPayment]);

  const handlePay = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const { redirect } = await initiatePayment({
        amount: MEMBERSHIP_FEE_GHS,
        currency: "GHS",
        method: "card",
      });

      // Persist the journey so the profile survives the provider redirect.
      // The username/createdAt are set at finalization; empty here is fine.
      const snapshot = {
        ...data,
        email: data.email || user?.email || "",
        username: "",
        createdAt: new Date().toISOString(),
        membershipStatus: "active" as const,
      };
      savePaymentSnapshot(snapshot);

      const authorizationUrl = (redirect as { authorization_url?: string })
        ?.authorization_url;

      if (authorizationUrl) {
        window.location.assign(authorizationUrl);
      } else {
        // No provider configured (mock mode) — advance as before.
        submitPayment();
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to start payment. Try again."
      );
      setIsSubmitting(false);
    }
  };

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

      {error && (
        <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-500">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3">
        <Button
          onClick={handlePay}
          disabled={isSubmitting}
          className="w-full rounded-xl"
        >
          {isSubmitting ? "Starting payment..." : `Pay GHS ${MEMBERSHIP_FEE_GHS}`}
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
