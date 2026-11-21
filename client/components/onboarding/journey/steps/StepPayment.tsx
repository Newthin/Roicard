/**
 * Step 10 - Payment
 *
 * Collects the payment method for the plan selected in the membership step.
 * The client sends only the plan code: the server resolves the amount and
 * billing period, so pricing cannot be tampered with in the browser.
 */

"use client";

import { useJourney } from "@/components/onboarding/journey/JourneyContext";
import { StepHeading } from "@/components/onboarding/journey/StepHeading";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/cn";
import {
  confirmMockPayment,
  initiatePayment,
  rememberPaymentReference,
} from "@/lib/api/payments";
import { getSelectedPlan, type SelectedPlan } from "@/lib/profile/plan-selection";
import { savePaymentSnapshot } from "@/lib/profile/storage";
import { PAYMENT_METHODS } from "@/lib/profile/types";
import { useEffect, useRef, useState } from "react";

const FALLBACK_PLAN: SelectedPlan = {
  code: "annual",
  name: "Annual",
  amount: 350,
  originalAmount: null,
  interval: "year",
  initialPrice: 350,
  recurringPrice: 250,
  includesCard: true,
  purpose: "initial",
};

export function StepPayment() {
  const { user, refreshUser } = useAuth();
  const { data, submitPayment, skipMembership } = useJourney();
  const [method, setMethod] = useState<string>(PAYMENT_METHODS[0].id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan] = useState<SelectedPlan>(
    () => getSelectedPlan() ?? FALLBACK_PLAN
  );
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (redirectedRef.current) return;
    if (user?.has_active_subscription) {
      redirectedRef.current = true;
      submitPayment();
    }
  }, [user, submitPayment]);

  const handlePay = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const { payment, redirect, activated } = await initiatePayment({
        plan: plan.code,
        currency: "GHS",
        method: method === "card" ? "card" : "mobile_money",
        campaign_code: plan.campaignCode ?? undefined,
      });

      // Nothing to charge (full credit or 100% discount): the server already
      // applied the plan through the subscription lifecycle.
      if (activated) {
        try {
          await refreshUser();
        } catch {
          // Activation already happened server-side.
        }
        submitPayment();
        return;
      }

      if (!payment) {
        setError("Payment could not be started. Please try again.");
        setIsSubmitting(false);
        return;
      }

      rememberPaymentReference(payment.provider_reference);

      // Persist the journey so the profile survives the provider redirect.
      // Membership is NOT marked active locally - the server confirms it.
      const snapshot = {
        ...data,
        email: data.email || user?.email || "",
        username: "",
        createdAt: new Date().toISOString(),
        membershipStatus: "pending" as const,
      };
      savePaymentSnapshot(snapshot);

      const providerRedirect = (redirect ?? {}) as {
        authorization_url?: string;
        checkout_url?: string;
        status?: string;
        mock?: boolean;
      };

      // The pending attempt already completed at the provider.
      if (providerRedirect.status === "success") {
        try {
          await refreshUser();
        } catch {
          // Activation already happened server-side.
        }
        submitPayment();
        return;
      }

      const checkoutUrl =
        providerRedirect.authorization_url ?? providerRedirect.checkout_url;

      if (checkoutUrl) {
        window.location.assign(checkoutUrl);
        return;
      }

      if (providerRedirect.mock) {
        // Mock provider: confirm explicitly so the backend runs the same
        // activation path as a verified webhook. Nothing is faked client-side.
        await confirmMockPayment(payment.provider_reference);
        try {
          await refreshUser();
        } catch {
          // Non-fatal; StepProcessing re-checks via the status endpoint.
        }
        submitPayment();
        return;
      }

      setError("Payment is not available right now. Please try again shortly.");
      setIsSubmitting(false);
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
        description={`Complete your ${plan.name} membership payment.`}
      />

      <div className="rounded-2xl border border-roicard-border bg-roicard-bg-elevated/70 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-roicard-text">
              {plan.name} membership
            </p>
            <p className="mt-1 text-xs text-roicard-text-muted">
              {plan.includesCard
                ? "Includes your physical Roicard card and delivery."
                : "Full paid features."}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-roicard-text">
              GHS {plan.amount}
            </p>
            {plan.originalAmount !== null && plan.originalAmount > plan.amount && (
              <p className="text-xs text-roicard-text-muted line-through">
                GHS {plan.originalAmount}
              </p>
            )}
          </div>
        </div>
      </div>

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
                  selected ? "border-roicard-accent" : "border-roicard-border"
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
          {isSubmitting ? "Starting payment..." : `Pay GHS ${plan.amount}`}
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
