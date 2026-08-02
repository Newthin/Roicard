/**
 * MembershipPaymentCard
 *
 * Dashboard card offering members who haven't paid to activate their one-time
 * membership fee. Reuses the Paystack payment flow: initiates a payment,
 * persists the user's profile for resume, and redirects to the provider (or
 * advances mock mode when no provider is configured).
 */

"use client";

import { Button } from "@/components/ui/Button";
import { useLiveMemberStatus } from "@/hooks/useLiveMemberStatus";
import { initiatePayment } from "@/lib/api/payments";
import {
  getCurrentUserProfile,
  savePaymentSnapshot,
} from "@/lib/profile/storage";
import { MEMBERSHIP_BENEFITS, MEMBERSHIP_FEE_GHS } from "@/lib/profile/types";
import { Check, Loader2, Wallet } from "lucide-react";
import { useCallback, useState } from "react";

export function MembershipPaymentCard() {
  const { status, isLoading } = useLiveMemberStatus();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hide entirely once the backend confirms the member is active.
  if (!isLoading && status === "active") {
    return null;
  }

  const handlePay = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      // Preserve the user's profile so the payment redirect doesn't lose it.
      const current = await getCurrentUserProfile();
      if (current) {
        savePaymentSnapshot({
          ...current,
          membershipStatus: "active",
        });
      }

      const { redirect } = await initiatePayment({
        amount: MEMBERSHIP_FEE_GHS,
        currency: "GHS",
        method: "card",
      });

      const authorizationUrl = (redirect as { authorization_url?: string })
        ?.authorization_url;

      if (authorizationUrl) {
        window.location.assign(authorizationUrl);
      } else {
        // No provider configured (mock mode) — surface a note to the member.
        setError(
          "Payment is not yet available. Please try again shortly."
        );
        setIsSubmitting(false);
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to start payment. Try again."
      );
      setIsSubmitting(false);
    }
  }, [isSubmitting]);

  return (
    <section className="rounded-2xl border border-roicard-accent/40 bg-gradient-to-br from-roicard-primary/10 to-roicard-bg-elevated p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-roicard-accent/15">
          <Wallet className="h-5 w-5 text-roicard-accent" />
        </div>
        <div>
          <h2 className="text-base font-bold text-roicard-text">
            Activate your membership
          </h2>
          <p className="text-sm text-roicard-text-muted">
            Unlock everything Roicard has to offer.
          </p>
        </div>
      </div>

      <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {MEMBERSHIP_BENEFITS.map((benefit) => (
          <li key={benefit} className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-roicard-primary/15 text-roicard-accent">
              <Check className="h-3.5 w-3.5" />
            </span>
            <span className="text-sm text-roicard-text">{benefit}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-col gap-3 border-t border-roicard-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-roicard-text-muted">
            One-time activation fee
          </p>
          <p className="mt-1 text-2xl font-bold text-roicard-text">
            GHS {MEMBERSHIP_FEE_GHS}
          </p>
        </div>

        <Button
          onClick={handlePay}
          disabled={isSubmitting}
          className="rounded-xl"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Pay now"
          )}
        </Button>
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-500">
          {error}
        </p>
      )}
    </section>
  );
}