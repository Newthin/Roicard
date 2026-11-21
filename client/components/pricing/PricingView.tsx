"use client";

/**
 * Public pricing page.
 *
 * Prices, campaign discounts and savings are read from the server catalogue.
 * The monthly/annual toggle only changes which plan is emphasised; checkout
 * always re-prices on the server.
 */

import { useAuth } from "@/contexts/AuthContext";
import { getPlans, type PlansResponse } from "@/lib/api/plans";
import { cn } from "@/lib/cn";
import { Check } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const FALLBACK: PlansResponse = {
  currency: "GHS",
  annual_savings: null,
  membership: null,
  plans: [
    {
      code: "free",
      name: "Free",
      description: "A complete public profile at no cost.",
      currency: "GHS",
      initial_price: 0,
      price: 0,
      interval: "none",
      includes_card: false,
      is_active: true,
      is_public: true,
      sort_order: 1,
      schedule: { year_one: 0, year_two_plus: null, savings_vs_monthly: null },
    },
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
      schedule: { year_one: 410, year_two_plus: 360, savings_vs_monthly: null },
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
      highlight: true,
      schedule: { year_one: 350, year_two_plus: 250, savings_vs_monthly: 60 },
    },
  ],
};

const FREE_FEATURES = [
  "Public profile and personal link",
  "QR code and unlimited sharing",
  "Connections and requests",
  "3 education and experience entries",
];

const PAID_FEATURES = [
  "Everything in Free",
  "Physical Roicard card and delivery",
  "Meeting booking on your profile",
  "Full analytics and contact export",
  "CV review and AI enrichment",
  "Unlimited profile sections",
  "Custom branding, no Roicard badge",
  "Priority support",
];

export function PricingView() {
  const { user } = useAuth();
  const [data, setData] = useState<PlansResponse>(FALLBACK);
  const [mode, setMode] = useState<"annual" | "monthly">("annual");

  useEffect(() => {
    getPlans()
      .then((response) => {
        if (response.plans.length > 0) setData(response);
      })
      .catch(() => {
        // Fallback catalogue keeps the page usable if the API is unreachable.
      });
  }, []);

  const annual = data.plans.find((plan) => plan.code === "annual");
  const monthly = data.plans.find((plan) => plan.code === "monthly");
  const highlighted = mode === "annual" ? annual : monthly;

  const ctaHref = user
    ? user.onboarding_completed
      ? "/dashboard/settings?tab=billing"
      : "/onboarding"
    : `/auth/register?plan=${mode}`;

  const ctaLabel = user
    ? user.onboarding_completed
      ? "Manage billing"
      : "Continue onboarding"
    : "Get started";

  const savings = data.annual_savings;

  return (
    <div className="min-h-screen bg-roicard-bg">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6">
        <Link href="/" className="text-sm font-bold tracking-[0.3em] text-roicard-text">
          ROICARD
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link
            href="/"
            className="text-roicard-text-muted transition-colors hover:text-roicard-text"
          >
            Home
          </Link>
          <Link
            href={user ? "/dashboard" : "/auth/login"}
            className="rounded-lg border border-roicard-border px-3 py-2 text-roicard-text transition-colors hover:border-roicard-accent"
          >
            {user ? "Dashboard" : "Sign in"}
          </Link>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl px-5 pb-20">
        <section className="mx-auto max-w-2xl pt-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-roicard-text sm:text-5xl">
            Your identity, your network, your card.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-roicard-text-muted">
            Start free with a public profile and unlimited sharing. Upgrade when
            you want the physical Roicard card, meetings, analytics and the full
            toolkit.
          </p>
        </section>

        <div className="mt-8 flex justify-center">
          <div className="inline-flex rounded-full border border-roicard-border bg-roicard-bg-elevated p-1">
            <button
              type="button"
              onClick={() => setMode("annual")}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                mode === "annual"
                  ? "bg-roicard-accent text-white"
                  : "text-roicard-text-muted hover:text-roicard-text"
              )}
            >
              Annual
            </button>
            <button
              type="button"
              onClick={() => setMode("monthly")}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                mode === "monthly"
                  ? "bg-roicard-accent text-white"
                  : "text-roicard-text-muted hover:text-roicard-text"
              )}
            >
              Monthly
            </button>
          </div>
        </div>

        {mode === "annual" && savings && (
          <p className="mt-4 text-center text-sm text-roicard-accent">
            Save GHS {savings.year_one_amount} in year one (
            {savings.year_one_percent}%) versus paying monthly.
          </p>
        )}

        <section className="mt-10 grid gap-5 lg:grid-cols-3">
          <div className="rounded-3xl border border-roicard-border bg-roicard-bg-elevated/70 p-6">
            <p className="text-sm font-semibold text-roicard-text">Free</p>
            <p className="mt-1 text-xs text-roicard-text-muted">
              Everything you need to be findable.
            </p>
            <p className="mt-6 text-3xl font-bold text-roicard-text">GHS 0</p>
            <p className="text-xs text-roicard-text-muted">forever</p>

            <ul className="mt-6 space-y-3">
              {FREE_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-roicard-accent" />
                  <span className="text-roicard-text">{feature}</span>
                </li>
              ))}
            </ul>

            <Link
              href={user ? "/dashboard" : "/auth/register"}
              className="mt-8 block rounded-xl border border-roicard-border px-4 py-3 text-center text-sm font-semibold text-roicard-text transition-colors hover:border-roicard-accent"
            >
              {user ? "Go to dashboard" : "Create a free profile"}
            </Link>
          </div>

          <div
            className={cn(
              "relative rounded-3xl border p-6",
              highlighted?.code === "annual"
                ? "border-roicard-accent bg-roicard-accent/5 shadow-lg"
                : "border-roicard-border bg-roicard-bg-elevated/70"
            )}
          >
            {highlighted?.code === "annual" && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-roicard-accent px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                Best value
              </span>
            )}
            <p className="text-sm font-semibold text-roicard-text">
              {mode === "annual" ? "Annual" : "Monthly"}
            </p>
            <p className="mt-1 text-xs text-roicard-text-muted">
              {mode === "annual"
                ? "Card and twelve months of full access."
                : "Card and your first month, then flexible monthly billing."}
            </p>

            <p className="mt-6 text-3xl font-bold text-roicard-text">
              GHS{" "}
              {mode === "annual"
                ? annual?.initial_price ?? 350
                : monthly?.initial_price ?? 80}
            </p>
            <p className="text-xs text-roicard-text-muted">
              {mode === "annual"
                ? `renews at GHS ${annual?.price ?? 250}/year`
                : `then GHS ${monthly?.price ?? 30}/month`}
            </p>

            <ul className="mt-6 space-y-3">
              {PAID_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-roicard-accent" />
                  <span className="text-roicard-text">{feature}</span>
                </li>
              ))}
            </ul>

            <Link
              href={ctaHref}
              className="mt-8 block rounded-xl bg-roicard-accent px-4 py-3 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              {ctaLabel}
            </Link>
            <p className="mt-3 text-center text-[11px] text-roicard-text-muted">
              Cancel anytime. Your profile stays on the free plan.
            </p>
          </div>

          <div className="rounded-3xl border border-dashed border-roicard-border p-6">
            <p className="text-sm font-semibold text-roicard-text">
              Growth Network
            </p>
            <p className="mt-1 text-xs text-roicard-text-muted">
              For teams, communities and partner networks.
            </p>
            <p className="mt-6 text-3xl font-bold text-roicard-text">Custom</p>
            <p className="text-xs text-roicard-text-muted">talk to us</p>

            <ul className="mt-6 space-y-3 text-sm text-roicard-text">
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-roicard-accent" />
                Bulk membership for your network
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-roicard-accent" />
                Executive referral dashboards
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-roicard-accent" />
                Commission tracking and payouts
              </li>
            </ul>

            <a
              href="mailto:admin@myroicard.com?subject=Growth%20Network"
              className="mt-8 block rounded-xl border border-roicard-border px-4 py-3 text-center text-sm font-semibold text-roicard-text transition-colors hover:border-roicard-accent"
            >
              Contact sales
            </a>
          </div>
        </section>

        <section className="mx-auto mt-14 max-w-3xl rounded-3xl border border-roicard-border bg-roicard-bg-elevated/50 p-6">
          <h2 className="text-lg font-semibold text-roicard-text">
            Frequently asked
          </h2>
          <dl className="mt-5 space-y-5">
            <div>
              <dt className="text-sm font-semibold text-roicard-text">
                What happens when my membership ends?
              </dt>
              <dd className="mt-1 text-sm text-roicard-text-muted">
                Your account and public profile stay online on the free plan.
                Paid features pause until you renew, and nothing is deleted.
              </dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-roicard-text">
                Can I switch from monthly to annual?
              </dt>
              <dd className="mt-1 text-sm text-roicard-text-muted">
                Yes. Upgrade at any time and the unused part of your current
                month is credited automatically.
              </dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-roicard-text">
                What if I already paid the old one-time fee?
              </dt>
              <dd className="mt-1 text-sm text-roicard-text-muted">
                You keep lifetime founding access to the MVP1 feature set at no
                extra cost. Card replacements and future add-ons are separate.
              </dd>
            </div>
          </dl>
        </section>
      </main>
    </div>
  );
}
