/**
 * BillingManagementView
 *
 * Admin billing console for internal roles. Grants the permanent executive and
 * staff plans to a member and lists/revokes current holders.
 * Route: /admin/billing
 *
 * Public paid plans stay on the public pricing page; these roles are never
 * purchasable and can only be assigned here (or through the same API).
 */

"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import {
  getAdminPlans,
  getAdminSubscriptions,
  getAdminUsers,
  grantAdminSubscription,
  revokeAdminSubscription,
  type AdminPlan,
  type AdminSubscription,
  type AdminUser,
} from "@/lib/api/admin";
import { cn } from "@/lib/cn";
import {
  AlertCircle,
  Check,
  Clock,
  Crown,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const INTERNAL_CODES = ["executive", "staff"] as const;
type InternalCode = (typeof INTERNAL_CODES)[number];

function planName(code: string): string {
  return code === "executive" ? "Executive" : "Staff";
}

function fullName(user: AdminUser | AdminSubscription["user"]): string {
  if (!user) return "Unknown member";
  return [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function BillingManagementView() {
  const { confirm } = useConfirm();

  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<AdminUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [planResponse, executive, staff] = await Promise.all([
        getAdminPlans(),
        getAdminSubscriptions({ plan: "executive", per_page: 100 }),
        getAdminSubscriptions({ plan: "staff", per_page: 100 }),
      ]);

      setPlans(planResponse.plans);
      setSubscriptions(
        [...(executive.data ?? []), ...(staff.data ?? [])].sort(
          (a, b) => b.id - a.id
        )
      );
    } catch {
      setLoadError("Unable to load the plan catalogue.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const term = search.trim();

    if (term.length < 2) {
      setResults([]);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    let active = true;
    setIsSearching(true);
    setSearchError(null);

    const timer = setTimeout(async () => {
      try {
        const response = await getAdminUsers({ search: term, per_page: 8 });
        if (active) setResults(response.data ?? []);
      } catch {
        if (active) {
          setResults([]);
          setSearchError("Unable to search members. Try again.");
        }
      } finally {
        if (active) setIsSearching(false);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search]);

  const internalPlans = useMemo(
    () => plans.filter((plan) => INTERNAL_CODES.includes(plan.code as InternalCode)),
    [plans]
  );

  const grant = async (user: AdminUser, code: InternalCode) => {
    const key = `grant-${user.id}-${code}`;
    const approved = await confirm({
      title: `Grant ${planName(code)}?`,
      description: `${fullName(user)} will get permanent full access immediately, including a physical card. This plan never expires — revoke it manually if needed.`,
      confirmLabel: "Grant access",
    });

    if (!approved) return;

    setBusyKey(key);
    setNotice(null);
    try {
      await grantAdminSubscription(user.id, code, false);
      setNotice(`${planName(code)} access granted to ${fullName(user)}.`);
      setSearch("");
      setResults([]);
      await load();
    } catch {
      setLoadError(`Unable to grant ${planName(code)} access.`);
    } finally {
      setBusyKey(null);
    }
  };

  const revoke = async (subscription: AdminSubscription) => {
    const user = subscription.user;
    if (!user) return;

    const approved = await confirm({
      title: `Revoke ${planName(subscription.plan?.code ?? "")}?`,
      description: `${fullName(user)} will lose internal access immediately and return to the Free plan. Their profile and data are not deleted.`,
      confirmLabel: "Revoke access",
      variant: "danger",
    });

    if (!approved) return;

    setBusyKey(`revoke-${subscription.id}`);
    setNotice(null);
    try {
      await revokeAdminSubscription(user.id);
      setNotice(`Internal access revoked for ${fullName(user)}.`);
      await load();
    } catch {
      setLoadError("Unable to revoke access.");
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-roicard-text">
            Billing &amp; internal plans
          </h1>
          <p className="mt-1 text-sm text-roicard-text-muted">
            Grant permanent Executive or Staff access. These plans are never
            sold publicly and never expire.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={load}
          isLoading={isLoading}
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          Refresh
        </Button>
      </header>

      {notice && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500">
          <Check className="h-4 w-4 shrink-0" aria-hidden />
          {notice}
        </div>
      )}

      {loadError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
          {loadError}
        </div>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold text-roicard-text">
          Internal plans
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {INTERNAL_CODES.map((code) => {
            const plan = internalPlans.find((item) => item.code === code);
            const isExecutive = code === "executive";
            const Icon = isExecutive ? Crown : ShieldCheck;

            return (
              <article
                key={code}
                className="rounded-xl border border-roicard-border bg-roicard-bg-elevated p-5"
              >
                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-roicard-accent/10 p-2 text-roicard-accent">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <h3 className="font-semibold text-roicard-text">
                      {plan?.name ?? planName(code)}
                    </h3>
                    <p className="text-xs text-roicard-text-muted">
                      {isExecutive
                        ? "Growth role · commission eligible"
                        : "Team & admin access · no commission"}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-sm text-roicard-text-muted">
                  {plan?.description ??
                    (isExecutive
                      ? "Internal growth role with permanent full access."
                      : "Internal staff access with permanent full benefits.")}
                </p>

                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-roicard-border px-2.5 py-1 text-roicard-text-muted">
                    <Clock className="mr-1 inline h-3 w-3" aria-hidden />
                    No expiry
                  </span>
                  <span className="rounded-full border border-roicard-border px-2.5 py-1 text-roicard-text-muted">
                    Full benefits
                  </span>
                  <span className="rounded-full border border-roicard-border px-2.5 py-1 text-roicard-text-muted">
                    Physical card
                  </span>
                </div>

                <p className="mt-4 text-xs text-roicard-text-muted">
                  {plan?.subscribers_count ?? 0} member(s) currently on this plan
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-roicard-border bg-roicard-bg-elevated p-5">
        <h2 className="text-lg font-semibold text-roicard-text">
          Grant access
        </h2>
        <p className="mt-1 text-sm text-roicard-text-muted">
          Search by name or email, then choose the plan to assign.
        </p>

        <div className="relative mt-4 max-w-md">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-roicard-text-muted"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search members…"
            className="pl-9"
            aria-label="Search members"
          />
        </div>

        {searchError && (
          <p className="mt-2 text-sm text-red-400">{searchError}</p>
        )}

        {search.trim().length < 2 ? (
          <p className="mt-4 text-sm text-roicard-text-muted">
            Type at least two characters to find a member.
          </p>
        ) : isSearching ? (
          <p className="mt-4 text-sm text-roicard-text-muted">Searching…</p>
        ) : results.length === 0 ? (
          <p className="mt-4 text-sm text-roicard-text-muted">
            No members matched “{search.trim()}”.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-roicard-border rounded-lg border border-roicard-border">
            {results.map((user) => (
              <li
                key={user.id}
                className="flex flex-wrap items-center justify-between gap-3 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-roicard-text">
                    {fullName(user)}
                  </p>
                  <p className="truncate text-xs text-roicard-text-muted">
                    {user.email} · {user.role}
                  </p>
                </div>
                <div className="flex gap-2">
                  {INTERNAL_CODES.map((code) => (
                    <Button
                      key={code}
                      size="sm"
                      variant={code === "executive" ? "primary" : "secondary"}
                      isLoading={busyKey === `grant-${user.id}-${code}`}
                      disabled={busyKey !== null}
                      onClick={() => grant(user, code)}
                    >
                      {planName(code)}
                    </Button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-roicard-border bg-roicard-bg-elevated p-5">
        <h2 className="text-lg font-semibold text-roicard-text">
          Current internal members
        </h2>

        {subscriptions.length === 0 ? (
          <p className="mt-4 text-sm text-roicard-text-muted">
            No members currently hold an internal plan.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-roicard-text-muted">
                <tr className="border-b border-roicard-border">
                  <th className="py-2 pr-4 font-medium">Member</th>
                  <th className="py-2 pr-4 font-medium">Plan</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Granted</th>
                  <th className="py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-roicard-border">
                {subscriptions.map((subscription) => (
                  <tr key={subscription.id}>
                    <td className="py-3 pr-4">
                      <p className="font-medium text-roicard-text">
                        {fullName(subscription.user)}
                      </p>
                      <p className="text-xs text-roicard-text-muted">
                        {subscription.user?.email ?? "—"}
                      </p>
                    </td>
                    <td className="py-3 pr-4 text-roicard-text">
                      {planName(subscription.plan?.code ?? "")}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs",
                          subscription.status === "active"
                            ? "bg-emerald-500/10 text-emerald-500"
                            : "bg-roicard-bg-muted text-roicard-text-muted"
                        )}
                      >
                        {subscription.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-roicard-text-muted">
                      {formatDate(subscription.started_at)}
                    </td>
                    <td className="py-3">
                      <Button
                        size="sm"
                        variant="danger"
                        isLoading={busyKey === `revoke-${subscription.id}`}
                        disabled={busyKey !== null}
                        onClick={() => revoke(subscription)}
                      >
                        Revoke
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="flex items-center gap-2 text-xs text-roicard-text-muted">
        <UserCheck className="h-4 w-4" aria-hidden />
        Admin accounts receive Staff benefits automatically and are not listed
        here unless granted explicitly.
      </p>
    </div>
  );
}
