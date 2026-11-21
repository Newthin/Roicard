/**
 * MembershipPaymentCard
 *
 * Dashboard upgrade card for free-tier members. Prices come from the server
 * plan catalogue and the client sends only a plan code; the server resolves
 * the amount, period and any upgrade credit.
 */

"use client";

import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useLiveMemberStatus } from "@/hooks/useLiveMemberStatus";
import {
  confirmMockPayment,
  initiatePayment,
  rememberPaymentReference,
} from "@/lib/api/payments";
import { getPlans, type Plan } from "@/lib/api/plans";
import {
  getCurrentUserProfile,
  savePaymentSnapshot,
} from "@/lib/profile/storage";
import { MEMBERSHIP_BENEFITS } from "@/lib/profile/types";
import { Check, Loader2, Wallet } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const FALLBACK_PLANS: Pick<Plan, "code" | "name" | "initial_price" | "price" | "interval">[] = [
  {
    code: "monthly",
    name: "Monthly",
    initial_price: 80,
    price: 30,
    interval: "month",
  },
  {
    code: "annual",
    name: "Annual",
    initial_price: 350,
    price: 250,
    interval: "year",
  },
];

function planLine(plan: (typeof FALLBACK_PLANS)[number]): string {
  return plan.interval === "year"
    ? `GHS ${plan.initial_price} first year, then GHS ${plan.price}/year`
    : `GHS ${plan.initial_price} today, then GHS ${plan.price}/month`;
}

export function MembershipPaymentCard() {
  const { user, refreshUser } = useAuth();
  const { membershipStatus, isLoading } = useLiveMemberStatus();
  const [plans, setPlans] = useState(FALLBACK_PLANS);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPlans()
      .then((data) => {
        const paid = data.plans
          .filter((plan) => plan.code === "monthly" || plan.code === "annual")
          .map((plan) => ({
            code: plan.code,
            name: plan.name,
            initial_price: plan.initial_price,
            price: plan.price,
            interval: plan.interval,
          }));

        if (paid.length > 0) setPlans(paid);
      })
      .catch(() => {
        // Fallback keeps the card usable; checkout is still priced server-side.
      });
  }, []);

  const handlePay = useCallback(
    async (planCode: string) => {
      if (busy) return;
      setBusy(planCode);
      setError(null);

      try {
        // Preserve the user's profile so the payment redirect doesn't lose it.
        const current = await getCurrentUserProfile();
        if (current) {
          savePaymentSnapshot({
            ...current,
            membershipStatus: "pending",
          });
        }

        const { payment, redirect, activated } = await initiatePayment({
          plan: planCode,
          currency: "GHS",
          method: "card",
        });

        if (activated) {
          await refreshUser().catch(() => null);
          window.location.reload();
          return;
        }

        if (!payment) {
          setError("Payment could not be started. Please try again.");
          setBusy(null);
          return;
        }

        rememberPaymentReference(payment.provider_reference);

        const providerRedirect = (redirect ?? {}) as {
          authorization_url?: string;
          checkout_url?: string;
          status?: string;
          mock?: boolean;
        };

        if (providerRedirect.status === "success") {
          await refreshUser().catch(() => null);
          window.location.reload();
          return;
        }

        const checkoutUrl =
          providerRedirect.authorization_url ?? providerRedirect.checkout_url;

        if (checkoutUrl) {
          window.location.assign(checkoutUrl);
          return;
        }

        if (providerRedirect.mock) {
          await confirmMockPayment(payment.provider_reference);
          await refreshUser().catch(() => null);
          window.location.reload();
          return;
        }

        setError("Payment is not available right now. Please try again shortly.");
        setBusy(null);
      } catch (e) {
        const serverMessage = (
          e as { response?: { data?: { message?: string } } } | null
        )?.response?.data?.message;
        setError(
          serverMessage ??
            (e instanceof Error ? e.message : "Unable to start payment. Try again.")
        );
        setBusy(null);
      }
    },
    [busy, refreshUser]
  );

  // Hide only while a paid/recurring plan is actually active. Expired and
  // canceled members are on the free plan and need the upgrade choices again.
  const hasPaidAccess =
    membershipStatus === "active" ||
    membershipStatus === "grace" ||
    membershipStatus === "founding" ||
    user?.has_active_subscription ||
    user?.is_founding_member;

  if (!isLoading && hasPaidAccess) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-roicard-accent/40 bg-gradient-to-br from-roicard-primary/10 to-roicard-bg-elevated p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-roicard-accent/15">
          <Wallet className="h-5 w-5 text-roicard-accent" />
        </div>
        <div>
          <h2 className="text-base font-bold text-roicard-text">
            Upgrade your membership
          </h2>
          <p className="text-sm text-roicard-text-muted">
            Add the physical card and unlock the full Roicard toolkit.
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

      <div className="mt-6 grid gap-3 border-t border-roicard-border pt-5 sm:grid-cols-2">
        {plans.map((plan) => (
          <div
            key={plan.code}
            className="rounded-xl border border-roicard-border bg-roicard-bg p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold capitalize text-roicard-text">
                {plan.name}
              </p>
              {plan.code === "annual" && (
                <span className="rounded-full bg-roicard-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-roicard-accent">
                  Best value
                </span>
              )}
            </div>
            <p className="mt-2 text-xs text-roicard-text-muted">
              {planLine(plan)}
            </p>
            <Button
              onClick={() => handlePay(plan.code)}
              disabled={Boolean(busy)}
              isLoading={busy === plan.code}
              variant={plan.code === "annual" ? "primary" : "secondary"}
              className="mt-4 w-full rounded-xl"
              size="sm"
            >
              {plan.code === "annual" ? "Choose annual" : "Choose monthly"}
            </Button>
          </div>
        ))}
      </div>

      <p className="mt-4 text-center text-xs text-roicard-text-muted">
        Prices are confirmed at checkout.{" "}
        <Link href="/pricing" className="font-medium text-roicard-accent">
          Compare plans
        </Link>
      </p>

      {error && (
        <p className="mt-3 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-500">
          {error}
        </p>
      )}
    </section>
  );
}
