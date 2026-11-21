/**
 * MemberReferralDashboardView
 *
 * Read-only referral tools for verified members. Route: /dashboard/referrals
 * Rewards are non-cash credits; Executive cash payouts are unaffected.
 */

"use client";

import { Button, Card, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import {
  getMemberReferralDashboard,
  type MemberReferralDashboard,
} from "@/lib/api/memberReferral";
import axios from "axios";
import {
  Check,
  Coins,
  Copy,
  MousePointerClick,
  RefreshCw,
  UserPlus,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type LoadState = "loading" | "ready" | "ineligible" | "error";

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

function fullName(person: { first_name: string; last_name: string; email: string } | null): string {
  if (!person) return "Unknown member";
  return [person.first_name, person.last_name].filter(Boolean).join(" ") || person.email;
}

function statusClass(status: string): string {
  if (status === "used") return "bg-sky-500/10 text-sky-400";
  if (status === "available") return "bg-emerald-500/10 text-emerald-500";
  if (status === "cancelled" || status === "adjustment") return "bg-red-500/10 text-red-400";
  return "bg-amber-500/10 text-amber-500";
}

export function MemberReferralDashboardView() {
  const [data, setData] = useState<MemberReferralDashboard | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setState("loading");
    try {
      setData(await getMemberReferralDashboard());
      setState("ready");
    } catch (error) {
      setState(
        axios.isAxiosError(error) && error.response?.status === 403
          ? "ineligible"
          : "error"
      );
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const copyLink = async () => {
    if (!data?.referral) return;
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

  if (state === "ineligible") {
    return (
      <Card className="mx-auto max-w-xl text-center">
        <CardHeader>
          <CardTitle>Verify your account to refer</CardTitle>
          <CardDescription>
            Referral tools are available to verified, active members. Check your
            email verification status and try again.
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
      <Card className="mx-auto max-w-xl text-center">
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
      label: "Credit earned",
      value: money(data.summary.credits_earned, data.summary.currency),
      hint: "From first membership purchases",
      icon: Coins,
    },
    {
      label: "Available credit",
      value: money(data.summary.available_balance, data.summary.currency),
      hint: "Applied automatically at checkout",
      icon: Wallet,
    },
    {
      label: "Credit used",
      value: money(data.summary.credits_used, data.summary.currency),
      hint: "Already spent on your plan",
      icon: Check,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-roicard-text">Refer a member</h1>
          <p className="mt-1 text-sm text-roicard-text-muted">
            Share your link. When a referred member makes their first membership
            payment, you both benefit — you receive account credit, not cash.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={load}>
          <RefreshCw className="h-4 w-4" aria-hidden />
          Refresh
        </Button>
      </header>

      {data.referral && (
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
      )}

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
          <CardTitle>How it works</CardTitle>
          <CardDescription>
            Rewards are applied by the server — the amount can never be changed
            by a link or a browser.
          </CardDescription>
        </CardHeader>
        <ul className="list-disc space-y-2 pl-5 text-sm text-roicard-text-muted">
          <li>10% of a referred member&apos;s first membership payment, capped at GHS 50.</li>
          <li>The referred member pays the discounted price; you get equal credit after payment clears.</li>
          <li>Credit applies automatically to your next membership payment and expires after 12 months.</li>
          <li>No cash payout, no stacking with campaign discounts, and no repeat reward for renewals.</li>
        </ul>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Referred members</CardTitle>
          <CardDescription>Members who registered through your link.</CardDescription>
        </CardHeader>
        {data.attributed_members.length === 0 ? (
          <p className="text-sm text-roicard-text-muted">No referred members yet.</p>
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Credit history</CardTitle>
            <CardDescription>Every referral credit movement on your account.</CardDescription>
          </CardHeader>
          {data.credits.length === 0 ? (
            <p className="text-sm text-roicard-text-muted">No referral credit yet.</p>
          ) : (
            <div className="space-y-3">
              {data.credits.map((credit) => (
                <div
                  key={credit.id}
                  className="flex items-center justify-between rounded-lg border border-roicard-border p-3 text-sm"
                >
                  <div>
                    <p className="text-roicard-text">{fullName(credit.member)}</p>
                    <p className="text-xs text-roicard-text-muted">
                      {formatDate(credit.created_at)}
                      {credit.expires_at ? ` · expires ${formatDate(credit.expires_at)}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-roicard-text">
                      {money(credit.amount, credit.currency)}
                    </p>
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${statusClass(credit.status)}`}
                    >
                      {credit.status}
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
    </div>
  );
}
