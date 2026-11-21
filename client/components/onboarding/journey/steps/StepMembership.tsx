/**
 * Step 09 - Membership
 *
 * Plan selection before payment. Pricing comes from the server catalogue
 * (`/plans`) so campaigns, upgrades and future price changes need no frontend
 * deploy. Payment remains optional: the free plan publishes the profile.
 */

"use client";

import { useJourney } from "@/components/onboarding/journey/JourneyContext";
import { StepHeading } from "@/components/onboarding/journey/StepHeading";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { getPlans, type Plan } from "@/lib/api/plans";
import { saveSelectedPlan } from "@/lib/profile/plan-selection";
import { FREE_BENEFITS, MEMBERSHIP_BENEFITS } from "@/lib/profile/types";
import { cn } from "@/lib/cn";
import { Check, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const FALLBACK_PLANS: Plan[] = [
  {
    code: "monthly",
    name: "Monthly",
    description: "Card + first month, then monthly.",
    currency: "GHS",
    initial_price: 80,
    price: 30,
    interval: "month",
    includes_card: true,
    is_active: true,
    is_public: true,
    sort_order: 2,
    schedule: {
      year_one: 410,
      year_two_plus: 360,
      savings_vs_monthly: null,
    },
  },
  {
    code: "annual",
    name: "Annual",
    description: "Card + 12 months of full access.",
    currency: "GHS",
    initial_price: 350,
    price: 250,
    interval: "year",
    includes_card: true,
    is_active: true,
    is_public: true,
    sort_order: 3,
    schedule: {
      year_one: 350,
      year_two_plus: 250,
      savings_vs_monthly: 60,
    },
  },
];

function amountFor(plan: Plan): number {
  return plan.quote?.amount ?? plan.initial_price;
}

function priceLine(plan: Plan): { headline: string; detail: string } {
  if (plan.code === "monthly") {
    return {
      headline: `GHS ${plan.initial_price} today`,
      detail: `then GHS ${plan.price}/month`,
    };
  }

  return {
    headline: `GHS ${plan.initial_price}/year`,
    detail: `renews at GHS ${plan.price}/year`,
  };
}

export function StepMembership() {
  const { user } = useAuth();
  const { activateMembership, skipMembership, next } = useJourney();
  const [plans, setPlans] = useState<Plan[]>(FALLBACK_PLANS);
  const [selected, setSelected] = useState<string>("annual");
  const [loading, setLoading] = useState(true);

  const hasPaidAccess =
    Boolean(user?.has_active_subscription) || user?.status === "active";

  useEffect(() => {
    let mounted = true;

    getPlans()
      .then((data) => {
        if (!mounted) return;

        const paid = data.plans.filter(
          (plan) => plan.code === "monthly" || plan.code === "annual"
        );

        if (paid.length > 0) setPlans(paid);
      })
      .catch(() => {
        // Keep the fallback catalogue; checkout still prices server-side.
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, []);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.code === selected) ?? plans[0],
    [plans, selected]
  );

  const choose = () => {
    if (!selectedPlan) return;

    const quote = selectedPlan.quote;

    saveSelectedPlan({
      code: selectedPlan.code,
      name: selectedPlan.name,
      amount: amountFor(selectedPlan),
      originalAmount:
        quote && quote.original_amount > quote.amount
          ? quote.original_amount
          : null,
      interval: selectedPlan.interval,
      initialPrice: selectedPlan.initial_price,
      recurringPrice: selectedPlan.price,
      includesCard: selectedPlan.includes_card,
      purpose: quote?.purpose ?? "initial",
      campaignCode: quote?.campaign?.code ?? null,
    });

    activateMembership();
  };

  if (hasPaidAccess) {
    return (
      <div className="space-y-7">
        <StepHeading
          eyebrow="Membership"
          title="Your Roicard Membership."
          description="Your membership is already active - there's nothing more to do here. Continue to complete your profile."
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
          Already Paid - Continue
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <StepHeading
        eyebrow="Membership"
        title="Choose your membership."
        description="Start free, or unlock the physical card and the full Roicard experience."
      />

      <div className="space-y-3">
        {loading && (
          <p className="flex items-center gap-2 text-xs text-roicard-text-muted">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading live
            pricing...
          </p>
        )}

        {plans.map((plan) => {
          const isSelected = selected === plan.code;
          const isAnnual = plan.code === "annual";
          const original = plan.quote?.original_amount ?? plan.initial_price;
          const payable = amountFor(plan);
          const line = priceLine(plan);

          return (
            <button
              key={plan.code}
              type="button"
              onClick={() => setSelected(plan.code)}
              aria-pressed={isSelected}
              className={cn(
                "w-full rounded-2xl border p-5 text-left transition-all",
                isSelected
                  ? "border-roicard-accent bg-roicard-accent/5"
                  : "border-roicard-border bg-roicard-bg-elevated/70 hover:border-roicard-accent/40"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-roicard-text">
                      {isAnnual ? "Annual" : "Monthly"}
                    </p>
                    {isAnnual && (
                      <span className="rounded-full bg-roicard-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-roicard-accent">
                        Best value
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-roicard-text-muted">
                    {line.headline} - {line.detail}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xl font-bold text-roicard-text">
                    GHS {payable}
                  </p>
                  {original > payable && (
                    <p className="text-xs text-roicard-text-muted line-through">
                      GHS {original}
                    </p>
                  )}
                </div>
              </div>

              {plan.quote?.blocked_reason && (
                <p className="mt-3 text-xs text-amber-500">
                  {plan.quote.blocked_reason}
                </p>
              )}

              {plan.includes_card && (
                <p className="mt-3 text-xs text-roicard-text-muted">
                  Includes your physical Roicard card and delivery.
                </p>
              )}
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-roicard-border bg-roicard-bg-elevated/70 p-6 theme-transition">
        <p className="text-sm font-semibold text-roicard-text">
          Everything in the paid plans
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

        <div className="mt-6 border-t border-roicard-border pt-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-roicard-text-muted">
            Free plan
          </p>
          <ul className="mt-3 space-y-2">
            {FREE_BENEFITS.map((benefit) => (
              <li
                key={benefit}
                className="flex items-start gap-2 text-xs text-roicard-text-muted"
              >
                <Check className="mt-0.5 h-3 w-3 shrink-0 text-roicard-accent" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Button
          onClick={choose}
          disabled={!selectedPlan}
          className="w-full rounded-xl"
        >
          {selectedPlan
            ? `Continue - GHS ${amountFor(selectedPlan)}`
            : "Continue"}
        </Button>
        <Button
          variant="secondary"
          onClick={skipMembership}
          className="w-full rounded-xl"
        >
          Continue with the Free plan
        </Button>
        <p className="text-center text-xs text-roicard-text-muted">
          Your public profile is published on the free plan. You can upgrade at
          any time.
        </p>
      </div>
    </div>
  );
}
