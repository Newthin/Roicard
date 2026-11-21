/**
 * ExecutiveReferralDashboardView
 *
 * Read-only Growth Network dashboard for Executive plan holders.
 * Route: /executive/referrals
 */

"use client";

import {
  getExecutiveDashboard,
  type ExecutiveDashboardData,
} from "@/lib/api/executive";
import { Button, Card, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import axios from "axios";
import {
  AlertCircle,
  Check,
  Clock,
  Coins,
  Copy,
  ExternalLink,
  MousePointerClick,
  RefreshCw,
  UserPlus,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type LoadState = "loading" | "ready" | "denied" | "error";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function money(amount: string, currency = "GHS"): string {
  const value = Number(amount);
  return `${currency} ${Number.isFinite(value) ? value.toFixed(2) : amount}`;
}

function fullName(user: { first_name: string; last_name: string; email: string } | null): string {
  if (!user) return "Unknown member";
  return [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email;
}

function statusClass(status: string): string {
  if (status === "paid") return "bg-sky-500/10 text-sky-400";
  if (status === "approved" || status === "cleared") return "bg-emerald-500/10 text-emerald-500";
  if (status === "cancelled") return "bg-red-500/10 text-red-400";
  return "bg-amber-500/10 text-amber-500";
}

export function ExecutiveReferralDashboardView() {
  const [data, setData] = useState<ExecutiveDashboardData | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setState("loading");
    try {
      setData(await getExecutiveDashboard());
      setState("ready");
    } catch (error) {
      setState(axios.isAxiosError(error) && error.response?.status === 403 ? "denied" : "error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const copyLink = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.referral.url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  if (state === "loading") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-roicard-border border-t-roicard-primary" />
      </div>
    );
  }

  if (state === "denied") {
    return (
      <Card className="mx-auto max-w-lg text-center">
        <CardHeader>
          <CardTitle>Executive access required</CardTitle>
          <CardDescription>
            This dashboard is available only to Executive plan holders.
          </CardDescription>
        </CardHeader>
        <Link href="/dashboard">
          <Button variant="secondary">Back to dashboard</Button>
        </Link>
      </Card>
    );
  }

  if (state === "error" || !data) {
    return (
      <Card className="mx-auto max-w-lg text-center">
        <CardHeader>
          <CardTitle>Unable to load your referral dashboard</CardTitle>
          <CardDescription>Please try again in a moment.</CardDescription>
        </CardHeader>
        <Button onClick={load}>
          <RefreshCw className="h-4 w-4" aria-hidden />
          Retry
        </Button>
      </Card>
    );
  }

  const metrics: Array<{ label: string; value: string; hint: string; icon: LucideIcon }> = [
    {
      label: "Link clicks",
      value: String(data.summary.clicks),
      hint: "Visits to your referral link",
      icon: MousePointerClick,
    },
    {
      label: "Members registered",
      value: String(data.summary.registered_members),
      hint: "Attributed through your link",
      icon: UserPlus,
    },
    {
      label: "Cleared commissions",
      value: money(data.summary.cleared_commissions_total, data.summary.currency),
      hint: `${data.summary.cleared_commissions_count} earning event(s)`,
      icon: Coins,
    },
    {
      label: "Ready to batch",
      value: money(data.summary.unbatched_amount, data.summary.currency),
      hint: "Cleared, not yet batched",
      icon: Wallet,
    },
    {
      label: "Pending approval",
      value: money(data.summary.pending_approval_amount, data.summary.currency),
      hint: "With finance review",
      icon: Clock,
    },
    {
      label: "Paid out",
      value: money(data.summary.paid_amount, data.summary.currency),
      hint: "Approved and transferred",
      icon: Check,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-roicard-text">Referral network</h1>
          <p className="mt-1 text-sm text-roicard-text-muted">
            Your referral performance, commissions and payout history.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={load}>
          <RefreshCw className="h-4 w-4" aria-hidden />
          Refresh
        </Button>
      </header>

      <Card>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-roicard-text-muted">
              Your referral link
            </p>
            <p className="font-mono text-lg font-semibold text-roicard-text">
              {data.referral.code}
            </p>
            <p className="max-w-xl break-all text-sm text-roicard-text-muted">
              {data.referral.url}
            </p>
            <Button size="sm" onClick={copyLink}>
              {copied ? (
                <Check className="h-4 w-4" aria-hidden />
              ) : (
                <Copy className="h-4 w-4" aria-hidden />
              )}
              {copied ? "Copied" : "Copy link"}
            </Button>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.referral.qr_url}
            alt={`QR code for referral ${data.referral.code}`}
            className="h-32 w-32 rounded-xl border border-roicard-border bg-white p-2"
          />
        </div>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map(({ label, value, hint, icon: Icon }) => (
          <Card key={label} className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-roicard-text-muted">{label}</p>
              <Icon className="h-5 w-5 text-roicard-accent" aria-hidden />
            </div>
            <p className="text-2xl font-semibold text-roicard-text">{value}</p>
            <p className="text-xs text-roicard-text-muted">{hint}</p>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Attributed members</CardTitle>
          <CardDescription>Members who registered through your referral link.</CardDescription>
        </CardHeader>
        {data.attributed_members.length === 0 ? (
          <p className="text-sm text-roicard-text-muted">No attributed members yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-roicard-text-muted">
                <tr className="border-b border-roicard-border">
                  <th className="py-2 pr-4 font-medium">Member</th>
                  <th className="py-2 pr-4 font-medium">Plan</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 font-medium">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-roicard-border">
                {data.attributed_members.map((member) => (
                  <tr key={member.id}>
                    <td className="py-3 pr-4">
                      <p className="text-roicard-text">{fullName(member)}</p>
                      <p className="text-xs text-roicard-text-muted">{member.email}</p>
                    </td>
                    <td className="py-3 pr-4 text-roicard-text-muted">
                      {member.plan_name ?? member.plan ?? "Free"}
                    </td>
                    <td className="py-3 pr-4 text-roicard-text-muted">
                      {member.membership_status ?? "—"}
                    </td>
                    <td className="py-3 text-roicard-text-muted">
                      {formatDate(member.referred_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Commissions</CardTitle>
          <CardDescription>Cash commissions earned from attributed payments.</CardDescription>
        </CardHeader>
        {data.commissions.length === 0 ? (
          <p className="text-sm text-roicard-text-muted">No commissions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-roicard-text-muted">
                <tr className="border-b border-roicard-border">
                  <th className="py-2 pr-4 font-medium">Member</th>
                  <th className="py-2 pr-4 font-medium">Type</th>
                  <th className="py-2 pr-4 font-medium">Amount</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Payout</th>
                  <th className="py-2 font-medium">Transfer reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-roicard-border">
                {data.commissions.map((commission) => (
                  <tr key={commission.id}>
                    <td className="py-3 pr-4 text-roicard-text">
                      {fullName(commission.member)}
                    </td>
                    <td className="py-3 pr-4 text-roicard-text-muted">{commission.type}</td>
                    <td className="py-3 pr-4 font-medium text-roicard-text">
                      {money(commission.amount, commission.currency)}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full px-2 py-1 text-xs ${statusClass(commission.status)}`}>
                        {commission.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-roicard-text-muted">
                      {commission.payout ? `#${commission.payout.batch_id} · ${commission.payout.status}` : "Not batched"}
                    </td>
                    <td className="py-3 text-roicard-text-muted">
                      {commission.payout?.transfer_reference ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Payout history</CardTitle>
            <CardDescription>Batches containing your commissions.</CardDescription>
          </CardHeader>
          {data.payouts.length === 0 ? (
            <p className="text-sm text-roicard-text-muted">No payout batches yet.</p>
          ) : (
            <div className="space-y-3">
              {data.payouts.map((payout) => (
                <div
                  key={payout.id}
                  className="flex items-center justify-between rounded-lg border border-roicard-border p-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-roicard-text">Batch #{payout.id}</p>
                    <p className="text-xs text-roicard-text-muted">
                      {payout.commission_count} commission(s) · {formatDate(payout.paid_at ?? payout.approved_at ?? payout.created_at)}
                    </p>
                    {payout.transfer_references.length > 0 && (
                      <p className="mt-1 text-xs text-roicard-text-muted">
                        Ref: {payout.transfer_references.join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-roicard-text">
                      {money(payout.amount, payout.currency)}
                    </p>
                    <span className={`rounded-full px-2 py-1 text-xs ${statusClass(payout.status)}`}>
                      {payout.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent link activity</CardTitle>
            <CardDescription>Privacy-safe click metadata, newest first.</CardDescription>
          </CardHeader>
          {data.recent_clicks.length === 0 ? (
            <p className="text-sm text-roicard-text-muted">No referral clicks yet.</p>
          ) : (
            <div className="space-y-3">
              {data.recent_clicks.map((click) => (
                <div key={click.id} className="rounded-lg border border-roicard-border p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-roicard-text">
                      {click.registered_user ? fullName(click.registered_user) : "Anonymous visit"}
                    </p>
                    <span className="shrink-0 text-xs text-roicard-text-muted">
                      {formatDate(click.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-roicard-text-muted">
                    {click.referrer ?? "Direct / unknown source"}
                  </p>
                </div>
              ))}
            </div>
          )}
          <p className="mt-4 text-xs text-roicard-text-muted">
            Raw IP addresses are never stored or displayed.
          </p>
        </Card>
      </div>

      <p className="text-center text-xs text-roicard-text-muted">
        Need to share your card?{" "}
        <Link href="/dashboard/profile" className="text-roicard-accent hover:underline">
          Open your profile <ExternalLink className="inline h-3 w-3" aria-hidden />
        </Link>
      </p>
    </div>
  );
}
