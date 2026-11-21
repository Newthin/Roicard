/**
 * CommissionsManagementView
 *
 * Read-only cash commission ledger for admin/finance review. Payout batches,
 * approval and CSV export are added in later Growth Network items.
 * Route: /admin/commissions
 */

"use client";

import { Button } from "@/components/ui/Button";
import {
  getAdminCommissions,
  type AdminCommission,
} from "@/lib/api/admin";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const TYPE_LABELS: Record<AdminCommission["type"], string> = {
  first_annual: "First annual",
  annual_upgrade: "Monthly → annual",
  discounted_annual: "Discounted annual",
};

function fullName(user: AdminCommission["executive"]): string {
  if (!user) return "Unknown";
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

function money(amount: string, currency: string): string {
  const value = Number(amount);
  return Number.isFinite(value)
    ? `${currency} ${value.toFixed(2)}`
    : `${currency} ${amount}`;
}

export function CommissionsManagementView() {
  const [commissions, setCommissions] = useState<AdminCommission[]>([]);
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await getAdminCommissions({
        status: status || undefined,
        type: type || undefined,
        per_page: 100,
      });
      setCommissions(response.data ?? []);
      setTotal(response.total ?? response.data?.length ?? 0);
    } catch {
      setLoadError("Unable to load the commission ledger.");
    } finally {
      setIsLoading(false);
    }
  }, [status, type]);

  useEffect(() => {
    load();
  }, [load]);

  const clearedTotal = commissions
    .filter((item) => item.status === "cleared")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-roicard-text">Commissions</h1>
          <p className="mt-1 text-sm text-roicard-text-muted">
            Cash commissions cleared for Executive referrals. Refunds and
            revoked memberships are shown as cancelled.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={load} isLoading={isLoading}>
          <RefreshCw className="h-4 w-4" aria-hidden />
          Refresh
        </Button>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-roicard-border bg-roicard-bg-elevated p-4">
          <p className="text-xs uppercase tracking-wide text-roicard-text-muted">
            Rows loaded
          </p>
          <p className="mt-1 text-2xl font-semibold text-roicard-text">{total}</p>
        </div>
        <div className="rounded-xl border border-roicard-border bg-roicard-bg-elevated p-4">
          <p className="text-xs uppercase tracking-wide text-roicard-text-muted">
            Cleared on this page
          </p>
          <p className="mt-1 text-2xl font-semibold text-emerald-500">
            GHS {clearedTotal.toFixed(2)}
          </p>
        </div>
        <div className="rounded-xl border border-roicard-border bg-roicard-bg-elevated p-4">
          <p className="text-xs uppercase tracking-wide text-roicard-text-muted">
            Filters
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <select
              aria-label="Filter by status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-lg border border-roicard-border bg-roicard-bg-muted px-2 py-1 text-sm text-roicard-text"
            >
              <option value="">All statuses</option>
              <option value="cleared">Cleared</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              aria-label="Filter by type"
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="rounded-lg border border-roicard-border bg-roicard-bg-muted px-2 py-1 text-sm text-roicard-text"
            >
              <option value="">All types</option>
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {loadError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
          {loadError}
        </div>
      )}

      <section className="rounded-xl border border-roicard-border bg-roicard-bg-elevated p-5">
        {commissions.length === 0 ? (
          <p className="text-sm text-roicard-text-muted">
            {isLoading
              ? "Loading commissions…"
              : "No commissions match these filters yet."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-roicard-text-muted">
                <tr className="border-b border-roicard-border">
                  <th className="py-2 pr-4 font-medium">Executive</th>
                  <th className="py-2 pr-4 font-medium">Member</th>
                  <th className="py-2 pr-4 font-medium">Type</th>
                  <th className="py-2 pr-4 font-medium">Amount</th>
                  <th className="py-2 pr-4 font-medium">Collected</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Payment</th>
                  <th className="py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-roicard-border">
                {commissions.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3 pr-4">
                      <p className="font-medium text-roicard-text">
                        {fullName(item.executive)}
                      </p>
                      <p className="text-xs text-roicard-text-muted">
                        {item.executive?.email ?? "—"}
                      </p>
                    </td>
                    <td className="py-3 pr-4">
                      <p className="text-roicard-text">{fullName(item.member)}</p>
                      <p className="text-xs text-roicard-text-muted">
                        {item.member?.email ?? "—"}
                      </p>
                    </td>
                    <td className="py-3 pr-4 text-roicard-text-muted">
                      {TYPE_LABELS[item.type] ?? item.type}
                    </td>
                    <td className="py-3 pr-4 font-medium text-roicard-text">
                      {money(item.amount, item.currency)}
                    </td>
                    <td className="py-3 pr-4 text-roicard-text-muted">
                      {item.collected_amount
                        ? money(item.collected_amount, item.currency)
                        : "—"}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={
                          item.status === "cleared"
                            ? "rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-500"
                            : "rounded-full bg-slate-500/10 px-2 py-1 text-xs text-slate-400"
                        }
                      >
                        {item.status}
                        {item.cancellation_reason
                          ? ` · ${item.cancellation_reason}`
                          : ""}
                      </span>
                    </td>
                    <td className="max-w-xs truncate py-3 pr-4 font-mono text-xs text-roicard-text-muted">
                      {item.payment?.reference ?? "—"}
                    </td>
                    <td className="py-3 text-roicard-text-muted">
                      {formatDate(item.cleared_at ?? item.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
