/**
 * Step 09 — Membership
 *
 * Explains the value of membership before any payment. Payment is OPTIONAL:
 * members can activate now or skip and pay later from their dashboard.
 */

"use client";

import { useJourney } from "@/components/onboarding/journey/JourneyContext";
import { StepHeading } from "@/components/onboarding/journey/StepHeading";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { MEMBERSHIP_BENEFITS, getActivationPricing } from "@/lib/profile/types";
import { Check } from "lucide-react";

export function StepMembership() {
  const { user } = useAuth();
  const { activateMembership, skipMembership, next } = useJourney();

  // The server is the source of truth for pricing (NLF campaign members pay a
  // discounted rate). Resolve server-first, falling back to the standard fee.
  const pricing = getActivationPricing(user);

  if (user?.status === "active") {
    return (
      <div className="space-y-7">
        <StepHeading
          eyebrow="Membership"
          title="Your Roicard Membership."
          description="Your membership is already active — there's nothing more to do here. Continue to complete your profile."
        />

        <div className="rounded-2xl border border-roicard-border bg-roicard-bg-elevated/70 p-6 theme-transition">
          <p className="text-sm font-semibold text-roicard-text">
            Membership includes
          </p>
          <ul className="mt-4 space-y-3">
            {MEMBERSHIP_BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-roicard-primary/15 text-roicard-accent">
                  <Check className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm text-roicard-text">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        <Button onClick={next} className="w-full rounded-xl">
          Already Paid — Continue
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <StepHeading
        eyebrow="Membership"
        title="Your Roicard Membership."
        description="One activation. Full access to everything Roicard offers."
      />

      <div className="rounded-2xl border border-roicard-border bg-roicard-bg-elevated/70 p-6 theme-transition">
        <p className="text-sm font-semibold text-roicard-text">
          Membership includes
        </p>
        <ul className="mt-4 space-y-3">
          {MEMBERSHIP_BENEFITS.map((benefit) => (
            <li key={benefit} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-roicard-primary/15 text-roicard-accent">
                <Check className="h-3.5 w-3.5" />
              </span>
              <span className="text-sm text-roicard-text">{benefit}</span>
            </li>
          ))}
        </ul>

          <p className="mt-6 border-t border-roicard-border pt-5 font-medium italic leading-relaxed text-roicard-text-muted">
            &ldquo;Reserved for professionals building something worth being known for.&rdquo;
          </p>

          <div className="mt-6 flex items-end justify-between border-t border-roicard-border pt-5">
            <div>
              <p className="text-xs uppercase tracking-wider text-roicard-text-muted">
                One-time activation fee
              </p>
              <div className="mt-1 flex flex-wrap items-baseline gap-2">
                <p className="text-2xl font-bold text-roicard-text">
                  {pricing.fee === 0 ? "FREE" : `GHS ${pricing.fee}`}
                </p>
                {pricing.original !== null && (
                  <p className="text-sm text-roicard-text-muted line-through">
                    GHS {pricing.original}
                  </p>
                )}
                {pricing.program && (
                  <span className="rounded-full border border-roicard-accent/40 bg-roicard-accent/15 px-2 py-0.5 text-xs font-semibold text-roicard-accent">
                    50% off · Program rate
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button onClick={activateMembership} className="w-full rounded-xl">
            Activate Membership
          </Button>
        <Button
          variant="secondary"
          onClick={skipMembership}
          className="w-full rounded-xl"
        >
          Not ready yet? Skip for now — your profile stays private as a draft until you activate.
        </Button>
      </div>
    </div>
  );
}
