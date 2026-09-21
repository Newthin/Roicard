/**
 * DiscountsManagementView
 *
 * Admin management of discount campaigns. Each campaign has a code, the
 * activation fee its members pay, an optional start/expiry timer, and an
 * open/closed state. Route: /admin/discounts
 */

"use client";

import {
  DataTable,
  DataTableCell,
  DataTableRow,
} from "@/components/admin/DataTable";
import {
  createAdminDiscountCampaign,
  getAdminDiscountCampaigns,
  updateAdminDiscountCampaign,
  type AdminDiscountCampaign,
} from "@/lib/api/admin";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";
import { Percent, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type FormState = {
  code: string;
  name: string;
  amount: string;
  starts_at: string;
  expires_at: string;
  is_active: boolean;
};

const EMPTY_FORM: FormState = {
  code: "",
  name: "",
  amount: "175",
  starts_at: "",
  expires_at: "",
  is_active: true,
};

/** Datetime-local string from an ISO date (empty when not set). */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusOf(campaign: AdminDiscountCampaign): {
  label: string;
  className: string;
} {
  const now = Date.now();
  const starts = campaign.starts_at ? new Date(campaign.starts_at).getTime() : null;
  const expires = campaign.expires_at
    ? new Date(campaign.expires_at).getTime()
    : null;

  if (!campaign.is_active) {
    return {
      label: "Closed",
      className: "border-red-500/30 bg-red-500/10 text-red-400",
    };
  }
  if (starts && starts > now) {
    return {
      label: "Scheduled",
      className: "border-sky-500/30 bg-sky-500/10 text-sky-400",
    };
  }
  if (expires && expires < now) {
    return {
      label: "Expired",
      className: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    };
  }
  return {
    label: "Live",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  };
}

export function DiscountsManagementView() {
  const [campaigns, setCampaigns] = useState<AdminDiscountCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminDiscountCampaign | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { campaigns: list } = await getAdminDiscountCampaigns();
      setCampaigns(list);
    } catch {
      setError("Unable to load discount campaigns.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setModalOpen(true);
  };

  const openEdit = (campaign: AdminDiscountCampaign) => {
    setEditing(campaign);
    setForm({
      code: campaign.code,
      name: campaign.name,
      amount: String(campaign.amount),
      starts_at: toLocalInput(campaign.starts_at),
      expires_at: toLocalInput(campaign.expires_at),
      is_active: campaign.is_active,
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setFormErrors({});

    const payload = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      amount: Number(form.amount),
      starts_at: form.starts_at ? form.starts_at : null,
      expires_at: form.expires_at ? form.expires_at : null,
      is_active: form.is_active,
    };

    try {
      if (editing) {
        await updateAdminDiscountCampaign(editing.id, payload);
      } else {
        await createAdminDiscountCampaign(payload);
      }
      setModalOpen(false);
      await load();
    } catch (e) {
      const serverErrors = (
        e as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } }
      )?.response?.data;
      if (serverErrors?.errors) {
        const flat: Record<string, string> = {};
        for (const [key, messages] of Object.entries(serverErrors.errors)) {
          flat[key] = messages[0];
        }
        setFormErrors(flat);
      } else {
        setFormErrors({
          code: serverErrors?.message ?? "Unable to save. Please try again.",
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (campaign: AdminDiscountCampaign) => {
    setTogglingId(campaign.id);
    try {
      await updateAdminDiscountCampaign(campaign.id, {
        is_active: !campaign.is_active,
      });
      await load();
    } catch {
      setError("Unable to update the campaign. Please try again.");
    } finally {
      setTogglingId(null);
    }
  };

  const columns = useMemo(
    () => [
      { key: "code", label: "Code" },
      { key: "name", label: "Name" },
      { key: "amount", label: "Fee (GHS)" },
      { key: "status", label: "Status" },
      { key: "window", label: "Starts / Ends" },
      { key: "members", label: "Members" },
      { key: "actions", label: "", className: "text-right" },
    ],
    []
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-roicard-text">
            <Percent className="h-6 w-6 text-roicard-accent" />
            Discounts
          </h1>
          <p className="mt-1 text-sm text-roicard-text-muted">
            Create campaign codes that give members a discounted activation fee.
            Close a campaign or set a timer at any time.
          </p>
        </div>
        <Button onClick={openCreate} className="rounded-lg">
          <Plus className="mr-2 h-4 w-4" />
          New Discount
        </Button>
      </div>

      {error && (
        <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-500">
          {error}
        </p>
      )}

      {isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-roicard-border border-t-roicard-primary" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="rounded-2xl border border-roicard-border bg-roicard-bg-elevated p-10 text-center">
          <p className="text-sm text-roicard-text-muted">
            No discount campaigns yet. Create one to offer a discounted
            activation fee.
          </p>
        </div>
      ) : (
        <DataTable columns={columns}>
          {campaigns.map((campaign) => {
            const status = statusOf(campaign);
            return (
              <DataTableRow key={campaign.id}>
                <DataTableCell className="font-mono font-semibold text-roicard-text">
                  {campaign.code}
                </DataTableCell>
                <DataTableCell className="text-roicard-text">
                  {campaign.name}
                </DataTableCell>
                <DataTableCell className="font-semibold text-roicard-text">
                  {campaign.amount === 0 ? "FREE" : campaign.amount.toFixed(2)}
                </DataTableCell>
                <DataTableCell>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                      status.className
                    )}
                  >
                    {status.label}
                  </span>
                </DataTableCell>
                <DataTableCell className="text-xs">
                  <span className="block">Start: {formatDate(campaign.starts_at)}</span>
                  <span className="block">End: {formatDate(campaign.expires_at)}</span>
                </DataTableCell>
                <DataTableCell>{campaign.users_count ?? 0}</DataTableCell>
                <DataTableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(campaign)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant={campaign.is_active ? "danger" : "secondary"}
                      size="sm"
                      disabled={togglingId === campaign.id}
                      onClick={() => handleToggle(campaign)}
                    >
                      {campaign.is_active
                        ? togglingId === campaign.id
                          ? "Closing…"
                          : "Close"
                        : togglingId === campaign.id
                          ? "Opening…"
                          : "Open"}
                    </Button>
                  </div>
                </DataTableCell>
              </DataTableRow>
            );
          })}
        </DataTable>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit discount campaign" : "New discount campaign"}
        description="Members who enter this code get the fee you set here."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setModalOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving…" : editing ? "Save changes" : "Create"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Code"
            placeholder="e.g. NLF2026"
            value={form.code}
            error={formErrors.code}
            onChange={(e) =>
              setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
            }
          />
          <Input
            label="Name"
            placeholder="e.g. NLF 2026 Program"
            value={form.name}
            error={formErrors.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Input
            label="Activation fee (GHS)"
            type="number"
            min={0}
            step="0.01"
            value={form.amount}
            error={formErrors.amount}
            hint="What a member on this campaign pays. Use 0 for free."
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Starts at (optional)"
              type="datetime-local"
              value={form.starts_at}
              error={formErrors.starts_at}
              onChange={(e) =>
                setForm((f) => ({ ...f, starts_at: e.target.value }))
              }
            />
            <Input
              label="Ends at (optional)"
              type="datetime-local"
              value={form.expires_at}
              error={formErrors.expires_at}
              onChange={(e) =>
                setForm((f) => ({ ...f, expires_at: e.target.value }))
              }
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-roicard-text">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) =>
                setForm((f) => ({ ...f, is_active: e.target.checked }))
              }
              className="h-4 w-4 rounded border-roicard-border"
            />
            Active (claimable by new members)
          </label>
        </div>
      </Modal>
    </div>
  );
}
