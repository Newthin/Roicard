/**
 * PayoutsManagementView
 *
 * Admin controls for Growth Network payouts: policy settings, generated batches
 * and one-click finance approval. Transfer references and CSV export are added
 * in the next item. Route: /admin/payouts
 */

"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import {
  approveAdminPayoutBatch,
  generateAdminPayoutBatches,
  getAdminPayoutBatch,
  getAdminPayoutBatches,
  getAdminPayoutSettings,
  updateAdminPayoutSettings,
  type AdminPayoutBatch,
  type AdminPayoutBatchItem,
  type AdminPayoutSettings,
} from "@/lib/api/admin";
import { AlertCircle, Check, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

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

function money(amount: string, currency: string): string {
  const value = Number(amount);
  return `${currency} ${Number.isFinite(value) ? value.toFixed(2) : amount}`;
}

function fullName(user: AdminPayoutBatchItem["executive"]): string {
  if (!user) return "Unknown executive";
  return [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email;
}

export function PayoutsManagementView() {
  const [settings, setSettings] = useState<AdminPayoutSettings | null>(null);
  const [batches, setBatches] = useState<AdminPayoutBatch[]>([]);
  const [minimum, setMinimum] = useState("100");
  const [cadence, setCadence] = useState("14");
  const [enabled, setEnabled] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [detail, setDetail] = useState<AdminPayoutBatch | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [settingsResult, batchesResult] = await Promise.all([
        getAdminPayoutSettings(),
        getAdminPayoutBatches({
          status: statusFilter || undefined,
          per_page: 100,
        }),
      ]);
      const loaded = settingsResult.settings;
      setSettings(loaded);
      setMinimum(loaded.minimum_amount);
      setCadence(String(loaded.cadence_days));
      setEnabled(loaded.is_enabled);
      setBatches(batchesResult.data ?? []);
    } catch {
      setError("Unable to load payout settings and batches.");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const saveSettings = async () => {
    setIsSaving(true);
    setNotice(null);
    setError(null);
    try {
      const result = await updateAdminPayoutSettings({
        minimum_amount: Number(minimum),
        cadence_days: Number(cadence),
        is_enabled: enabled,
      });
      setSettings(result.settings);
      setNotice(result.message);
    } catch {
      setError("Unable to save payout settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const generate = async (force: boolean) => {
    setIsSaving(true);
    setNotice(null);
    setError(null);
    try {
      const result = await generateAdminPayoutBatches(force);
      setNotice(result.message);
      await load();
    } catch {
      setError("Unable to generate payout batches.");
    } finally {
      setIsSaving(false);
    }
  };

  const approve = async (batch: AdminPayoutBatch) => {
    setIsSaving(true);
    setNotice(null);
    setError(null);
    try {
      const result = await approveAdminPayoutBatch(batch.id);
      setNotice(result.message);
      setBatches((current) =>
        current.map((item) => (item.id === batch.id ? result.batch : item))
      );
      if (detail?.id === batch.id) setDetail(result.batch);
    } catch {
      setError("Unable to approve this batch.");
    } finally {
      setIsSaving(false);
    }
  };

  const openDetail = async (batch: AdminPayoutBatch) => {
    try {
      const result = await getAdminPayoutBatch(batch.id);
      setDetail(result.batch);
    } catch {
      setError("Unable to load this batch.");
    }
  };

  const pendingTotal = batches
    .filter((batch) => batch.status === "pending")
    .reduce((sum, batch) => sum + Number(batch.total_amount || 0), 0);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-roicard-text">Payouts</h1>
          <p className="mt-1 text-sm text-roicard-text-muted">
            Batch cleared Executive commissions, then approve them for payment.
            Transfer references and CSV export follow in the next item.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={load} isLoading={isLoading}>
            <RefreshCw className="h-4 w-4" aria-hidden />
            Refresh
          </Button>
          <Button size="sm" onClick={() => generate(false)} isLoading={isSaving}>
            Generate batches
          </Button>
        </div>
      </header>

      {notice && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          <Check className="h-4 w-4 shrink-0" aria-hidden />
          {notice}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
          {error}
        </div>
      )}

      <section className="rounded-xl border border-roicard-border bg-roicard-bg-elevated p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-roicard-text">Payout policy</h2>
            <p className="mt-1 text-sm text-roicard-text-muted">
              Executives are batched when their cleared balance reaches the minimum.
              Generation runs every {cadence || "—"} days.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={saveSettings} isLoading={isSaving}>
            Save policy
          </Button>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-roicard-text-muted">Minimum payout (GHS)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={minimum}
              onChange={(event) => setMinimum(event.target.value)}
              className="rounded-lg border border-roicard-border bg-roicard-bg-muted px-3 py-2 text-roicard-text"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-roicard-text-muted">Cadence (days)</span>
            <input
              type="number"
              min="1"
              max="365"
              value={cadence}
              onChange={(event) => setCadence(event.target.value)}
              className="rounded-lg border border-roicard-border bg-roicard-bg-muted px-3 py-2 text-roicard-text"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-roicard-text">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
              className="h-4 w-4 rounded border-roicard-border"
            />
            Automatic generation enabled
          </label>
        </div>
        <p className="mt-3 text-xs text-roicard-text-muted">
          Last generated: {formatDate(settings?.last_generated_at ?? null)}
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-roicard-border bg-roicard-bg-elevated p-4">
          <p className="text-xs uppercase tracking-wide text-roicard-text-muted">Batches</p>
          <p className="mt-1 text-2xl font-semibold text-roicard-text">{batches.length}</p>
        </div>
        <div className="rounded-xl border border-roicard-border bg-roicard-bg-elevated p-4">
          <p className="text-xs uppercase tracking-wide text-roicard-text-muted">
            Awaiting approval
          </p>
          <p className="mt-1 text-2xl font-semibold text-amber-500">
            GHS {pendingTotal.toFixed(2)}
          </p>
        </div>
        <div className="rounded-xl border border-roicard-border bg-roicard-bg-elevated p-4">
          <p className="text-xs uppercase tracking-wide text-roicard-text-muted">Filter</p>
          <select
            aria-label="Filter by batch status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="mt-2 w-full rounded-lg border border-roicard-border bg-roicard-bg-muted px-2 py-1 text-sm text-roicard-text"
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
          </select>
        </div>
      </section>

      <section className="rounded-xl border border-roicard-border bg-roicard-bg-elevated p-5">
        {batches.length === 0 ? (
          <p className="text-sm text-roicard-text-muted">
            {isLoading ? "Loading payouts…" : "No payout batches yet."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-roicard-text-muted">
                <tr className="border-b border-roicard-border">
                  <th className="py-2 pr-4 font-medium">Batch</th>
                  <th className="py-2 pr-4 font-medium">Window</th>
                  <th className="py-2 pr-4 font-medium">Commissions</th>
                  <th className="py-2 pr-4 font-medium">Amount</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Approved</th>
                  <th className="py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-roicard-border">
                {batches.map((batch) => (
                  <tr key={batch.id}>
                    <td className="py-3 pr-4 font-medium text-roicard-text">#{batch.id}</td>
                    <td className="py-3 pr-4 text-roicard-text-muted">
                      {formatDate(batch.period_start)} → {formatDate(batch.period_end)}
                    </td>
                    <td className="py-3 pr-4 text-roicard-text-muted">
                      {batch.items_count ?? batch.items?.length ?? 0}
                    </td>
                    <td className="py-3 pr-4 font-medium text-roicard-text">
                      {money(batch.total_amount, batch.currency)}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={
                          batch.status === "approved"
                            ? "rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-500"
                            : "rounded-full bg-amber-500/10 px-2 py-1 text-xs text-amber-500"
                        }
                      >
                        {batch.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-roicard-text-muted">
                      {formatDate(batch.approved_at)}
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openDetail(batch)}>
                          View
                        </Button>
                        {batch.status === "pending" && (
                          <Button size="sm" onClick={() => approve(batch)} isLoading={isSaving}>
                            Approve
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        isOpen={detail !== null}
        onClose={() => setDetail(null)}
        title={`Payout batch #${detail?.id ?? ""}`}
        description={
          detail
            ? `${money(detail.total_amount, detail.currency)} · ${detail.status}`
            : undefined
        }
      >
        {detail && (
          <div className="space-y-3">
            <p className="text-xs text-roicard-text-muted">
              Window: {formatDate(detail.period_start)} → {formatDate(detail.period_end)}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-roicard-text-muted">
                  <tr className="border-b border-roicard-border">
                    <th className="py-2 pr-4 font-medium">Executive</th>
                    <th className="py-2 pr-4 font-medium">Type</th>
                    <th className="py-2 pr-4 font-medium">Amount</th>
                    <th className="py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-roicard-border">
                  {(detail.items ?? []).map((item) => (
                    <tr key={item.id}>
                      <td className="py-2 pr-4">
                        <p className="text-roicard-text">{fullName(item.executive)}</p>
                        <p className="text-xs text-roicard-text-muted">
                          {item.executive?.email ?? "—"}
                        </p>
                      </td>
                      <td className="py-2 pr-4 text-roicard-text-muted">
                        {item.commission?.type ?? "—"}
                      </td>
                      <td className="py-2 pr-4 text-roicard-text">
                        {money(item.amount, item.currency)}
                      </td>
                      <td className="py-2 text-roicard-text-muted">{item.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
