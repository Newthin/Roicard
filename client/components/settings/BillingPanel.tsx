"use client";

/**
 * BillingPanel
 *
 * Settings > Billing. Shows the current plan, renewal dates, upgrade options,
 * cancellation controls and invoice history. All amounts are re-priced by the
 * server when a plan is selected.
 */

import { useAuth } from "@/contexts/AuthContext";
import {
  cancelSubscription,
  getBilling,
  resumeSubscription,
  type BillingSummary,
} from "@/lib/api/billing";
import {
  confirmMockPayment,
  initiatePayment,
} from "@/lib/api/payments";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { AlertTriangle, Check, CreditCard, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function statusLabel(membership: BillingSummary["membership"]): string {
  if (membership.is_founding) return "Founding member";
  switch (membership.status) {
    case "active":
      return "Active";
    case "grace":
      return "Grace period";
    case "expired":
      return "Expired";
    case "canceled":
      return "Cancelled";
    default:
      return "Free plan";
  }
}

export function BillingPanel() {
  const { refreshUser } = useAuth();
  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getBilling();
      setBilling(data);
    } catch {
      setError("Unable to load billing details right now.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectPlan = async (code: string) => {
    if (busy) return;
    setBusy(code);
    setError(null);
    setNotice(null);

    try {
      const { payment, redirect, activated } = await initiatePayment({
        plan: code,
        method: "mobile_money",
      });

      if (activated) {
        await refreshUser().catch(() => null);
        await load();
        setNotice("Your plan has been updated.");
        return;
      }

      if (!payment) {
        setError("Payment could not be started. Please try again.");
        return;
      }

      const providerRedirect = (redirect ?? {}) as {
        authorization_url?: string;
        checkout_url?: string;
        status?: string;
        mock?: boolean;
      };

      if (providerRedirect.status === "success") {
        await refreshUser().catch(() => null);
        await load();
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
        await load();
        setNotice("Your plan has been updated.");
        return;
      }

      setError("Payment is not available right now. Please try again shortly.");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to change plan right now."
      );
    } finally {
      setBusy(null);
    }
  };

  const handleCancel = async () => {
    setBusy("cancel");
    setError(null);
    try {
      const result = await cancelSubscription();
      setNotice(result.message);
      await refreshUser().catch(() => null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to cancel right now.");
    } finally {
      setBusy(null);
    }
  };

  const handleResume = async () => {
    setBusy("resume");
    setError(null);
    try {
      const result = await resumeSubscription();
      setNotice(result.message);
      await refreshUser().catch(() => null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to resume right now.");
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-roicard-accent" />
      </div>
    );
  }

  if (!billing) {
    return (
      <div className="rounded-2xl border border-roicard-border bg-roicard-bg-elevated p-6 text-sm text-roicard-text-muted">
        {error ?? "Billing details are unavailable."}
      </div>
    );
  }

  const { membership, quotes, invoices } = billing;
  const paidPlan = quotes.monthly || quotes.annual;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-roicard-border bg-roicard-bg-elevated/70 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-roicard-text-muted">
              Current plan
            </p>
            <div className="mt-2 flex items-center gap-3">
              <h2 className="text-xl font-bold text-roicard-text">
                {membership.plan_name}
              </h2>
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                  membership.is_founding
                    ? "bg-amber-500/15 text-amber-500"
                    : membership.is_active
                      ? "bg-emerald-500/15 text-emerald-500"
                      : "bg-roicard-bg-muted text-roicard-text-muted"
                )}
              >
                {statusLabel(membership)}
              </span>
            </div>

            {membership.is_founding ? (
              <p className="mt-2 max-w-lg text-sm text-roicard-text-muted">
                You have lifetime founding access to the MVP1 feature set. There
                is no recurring payment and nothing to renew. Card replacements
                and future add-ons are billed separately.
              </p>
            ) : membership.is_active ? (
              <p className="mt-2 text-sm text-roicard-text-muted">
                {membership.cancel_at_period_end
                  ? `Access ends ${formatDate(membership.current_period_end)}.`
                  : `Renews ${formatDate(membership.current_period_end)}${
                      membership.price > 0
                        ? ` for GHS ${membership.price}`
                        : ""
                    }.`}
                {membership.status === "grace" &&
                  ` Grace ends ${formatDate(membership.grace_ends_at)}.`}
              </p>
            ) : (
              <p className="mt-2 max-w-lg text-sm text-roicard-text-muted">
                You are on the free plan. Your public profile stays online:
                upgrade to add the physical card, meetings, analytics and more.
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {membership.is_active && !membership.is_founding && (
              <>
                {membership.cancel_at_period_end ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleResume}
                    isLoading={busy === "resume"}
                  >
                    Keep my plan
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleCancel}
                    isLoading={busy === "cancel"}
                  >
                    Cancel renewal
                  </Button>
                )}
              </>
            )}
            <Link
              href="/pricing"
              className="inline-flex h-9 items-center rounded-lg border border-roicard-border px-3 text-sm font-medium text-roicard-text transition-colors hover:border-roicard-accent"
            >
              Compare plans
            </Link>
          </div>
        </div>

        {membership.status === "grace" && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-600">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Your renewal did not go through. You still have full access until{" "}
            {formatDate(membership.grace_ends_at)}.
          </div>
        )}
      </div>

      {!membership.is_founding && paidPlan && (
        <div className="rounded-2xl border border-roicard-border bg-roicard-bg-elevated/70 p-6">
          <p className="text-sm font-semibold text-roicard-text">
            {membership.is_active ? "Change plan" : "Upgrade"}
          </p>
          <p className="mt-1 text-xs text-roicard-text-muted">
            Switching from monthly to annual credits the unused part of your
            current month automatically.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(["monthly", "annual"] as const).map((code) => {
              const quote = quotes[code];
              if (!quote) return null;
              const isCurrent =
                membership.plan === code &&
                membership.is_active &&
                membership.status === "active";
              const blocked = quote.blocked_reason;

              return (
                <div
                  key={code}
                  className={cn(
                    "rounded-xl border p-4",
                    code === "annual"
                      ? "border-roicard-accent/40 bg-roicard-accent/5"
                      : "border-roicard-border bg-roicard-bg"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold capitalize text-roicard-text">
                      {code}
                    </p>
                    {isCurrent && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-roicard-accent">
                        <Check className="h-3 w-3" /> Current
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-lg font-bold text-roicard-text">
                    GHS {quote.amount}
                  </p>
                  <p className="text-[11px] text-roicard-text-muted">
                    {quote.purpose === "upgrade"
                      ? `Includes GHS ${quote.credit_applied} credit`
                      : code === "annual"
                        ? `then GHS ${quote.recurring_price}/year`
                        : `then GHS ${quote.recurring_price}/month`}
                  </p>

                  <Button
                    className="mt-4 w-full"
                    size="sm"
                    variant={code === "annual" ? "primary" : "secondary"}
                    disabled={Boolean(blocked) || isCurrent}
                    isLoading={busy === code}
                    onClick={() => selectPlan(code)}
                  >
                    {blocked
                      ? blocked
                      : isCurrent
                        ? "Active"
                        : quote.purpose === "upgrade"
                          ? "Upgrade to annual"
                          : membership.status === "grace"
                            ? "Renew plan"
                            : membership.is_active
                              ? "Switch"
                              : "Choose plan"}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {notice && (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600">
          {notice}
        </p>
      )}
      {error && (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-500">
          {error}
        </p>
      )}

      <div className="rounded-2xl border border-roicard-border bg-roicard-bg-elevated/70 p-6">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-roicard-text-muted" />
          <p className="text-sm font-semibold text-roicard-text">
            Payment history
          </p>
        </div>

        {invoices.length === 0 ? (
          <p className="mt-4 text-sm text-roicard-text-muted">
            No payments yet. Your invoices will appear here.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-roicard-border text-xs uppercase tracking-wider text-roicard-text-muted">
                  <th className="py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium">Plan</th>
                  <th className="py-2 pr-4 font-medium">Amount</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 font-medium">Reference</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="border-b border-roicard-border/60 last:border-0"
                  >
                    <td className="py-3 pr-4 text-roicard-text-muted">
                      {formatDate(invoice.created_at)}
                    </td>
                    <td className="py-3 pr-4 text-roicard-text">
                      {invoice.plan_name ?? invoice.plan ?? "Membership"}
                    </td>
                    <td className="py-3 pr-4 text-roicard-text">
                      {invoice.currency} {invoice.amount}
                    </td>
                    <td className="py-3 pr-4 capitalize text-roicard-text-muted">
                      {invoice.status}
                    </td>
                    <td className="py-3 font-mono text-xs text-roicard-text-muted">
                      {invoice.reference}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
