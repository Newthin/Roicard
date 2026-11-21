/**
 * ExecutivesManagementView
 *
 * Admin directory for Growth Network Executive plan holders. Shows the stable
 * referral code, short link and QR asset. Executive status comes from the plan
 * grant; this screen does not create or revoke roles (use Billing for that).
 * Route: /admin/executives
 */

"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import {
  getAdminExecutive,
  getAdminExecutives,
  type AdminExecutive,
} from "@/lib/api/admin";
import {
  AlertCircle,
  Check,
  Copy,
  Crown,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

function fullName(executive: AdminExecutive): string {
  const user = executive.user;
  if (!user) return "Unknown executive";
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

export function ExecutivesManagementView() {
  const [executives, setExecutives] = useState<AdminExecutive[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminExecutive | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await getAdminExecutives();
      setExecutives(response.executives ?? []);
    } catch {
      setLoadError("Unable to load the executive directory.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = async (id: number) => {
    setLoadingId(id);
    try {
      const response = await getAdminExecutive(id);
      setSelected(response.executive);
    } catch {
      setLoadError("Unable to load that executive's referral assets.");
    } finally {
      setLoadingId(null);
    }
  };

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(`${label} copied to clipboard.`);
    } catch {
      setNotice(`Unable to copy ${label.toLowerCase()}.`);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-roicard-text">Executives</h1>
          <p className="mt-1 text-sm text-roicard-text-muted">
            Referral codes, links and QR assets for Executive plan holders.
            Grant the role from Billing.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={load} isLoading={isLoading}>
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

      <section className="rounded-xl border border-roicard-border bg-roicard-bg-elevated p-5">
        {executives.length === 0 ? (
          <p className="text-sm text-roicard-text-muted">
            {isLoading
              ? "Loading executives…"
              : "No Executive plan holders yet. Grant the plan from Billing."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-roicard-text-muted">
                <tr className="border-b border-roicard-border">
                  <th className="py-2 pr-4 font-medium">Executive</th>
                  <th className="py-2 pr-4 font-medium">Referral code</th>
                  <th className="py-2 pr-4 font-medium">Short link</th>
                  <th className="py-2 pr-4 font-medium">Created</th>
                  <th className="py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-roicard-border">
                {executives.map((executive) => (
                  <tr key={executive.id}>
                    <td className="py-3 pr-4">
                      <p className="font-medium text-roicard-text">
                        {fullName(executive)}
                      </p>
                      <p className="text-xs text-roicard-text-muted">
                        {executive.user?.email ?? "—"}
                      </p>
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs tracking-wider text-roicard-text">
                      {executive.code}
                    </td>
                    <td className="max-w-xs truncate py-3 pr-4 text-roicard-text-muted">
                      {executive.url}
                    </td>
                    <td className="py-3 pr-4 text-roicard-text-muted">
                      {formatDate(executive.created_at)}
                    </td>
                    <td className="py-3">
                      <Button
                        size="sm"
                        variant="secondary"
                        isLoading={loadingId === executive.id}
                        onClick={() => openDetail(executive.id)}
                      >
                        View assets
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        isOpen={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? `${fullName(selected)} · referral assets` : "Referral assets"}
        description="Share the link or QR code. Attribution and click tracking come in the next Growth Network item."
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex flex-col items-center gap-3 rounded-lg border border-roicard-border bg-roicard-bg p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selected.qr_url}
                alt={`Referral QR code for ${fullName(selected)}`}
                className="h-40 w-40 rounded-md bg-white p-2"
              />
              <p className="text-xs text-roicard-text-muted">Scan to open the short link</p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-roicard-text-muted">
                Referral code
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-lg border border-roicard-border bg-roicard-bg-muted px-3 py-2 font-mono text-sm tracking-widest text-roicard-text">
                  {selected.code}
                </code>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => copy(selected.code, "Code")}
                >
                  <Copy className="h-4 w-4" aria-hidden />
                  Copy
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-roicard-text-muted">
                Short link
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={selected.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-w-0 flex-1 items-center gap-1 truncate rounded-lg border border-roicard-border bg-roicard-bg-muted px-3 py-2 text-sm text-roicard-accent hover:underline"
                >
                  <span className="truncate">{selected.url}</span>
                  <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
                </a>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => copy(selected.url, "Link")}
                >
                  <Copy className="h-4 w-4" aria-hidden />
                  Copy
                </Button>
              </div>
            </div>

            <p className="flex items-center gap-2 text-xs text-roicard-text-muted">
              <Crown className="h-4 w-4" aria-hidden />
              Created {formatDate(selected.created_at)}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
