"use client";

import { useAdmin } from "@/components/admin/AdminProvider";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { Modal } from "@/components/ui/Modal";
import type { AdminUser, AdminUserDetail } from "@/lib/admin/types";
import { Camera, CheckCircle2, CreditCard, ShieldAlert, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

function Badge({
  tone,
  children,
}: {
  tone: "green" | "amber" | "red" | "neutral";
  children: React.ReactNode;
}) {
  const tones = {
    green: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    red: "border-red-500/30 bg-red-500/10 text-red-400",
    neutral: "border-roicard-border bg-roicard-bg-muted text-roicard-text-muted",
  } as const;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
}

export function AdminUserDetailModal({
  user,
  onClose,
  onEdit,
}: {
  user: AdminUser | null;
  onClose: () => void;
  onEdit: (user: AdminUser) => void;
}) {
  const { getUserDetail, updateUser, uploadAvatar, removeAvatar } = useAdmin();
  const { confirm } = useConfirm();
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    const result = await getUserDetail(user.id);
    setDetail(result);
    if (!result) setError("Could not load this member's details.");
    setLoading(false);
  }, [getUserDetail, user]);

  useEffect(() => {
    if (!user) {
      setDetail(null);
      return;
    }
    load();
  }, [load, user]);

  if (!user) return null;

  const current = detail ?? { ...user, payments: [], paymentSummary: null };

  const perform = async (
    action: () => Promise<{ ok: true } | { ok: false; error: string }>
  ) => {
    setActing(true);
    setError("");
    const result = await action();
    if (!result.ok) setError(result.error);
    await load();
    setActing(false);
  };

  const handleMembership = async (activate: boolean) => {
    const confirmed = await confirm({
      title: activate ? "Activate membership?" : "Deactivate membership?",
      description: activate
        ? `${current.firstName} ${current.lastName} will be marked active and their public profile published. No payment record is created.`
        : `${current.firstName} ${current.lastName} will return to draft and their public profile will be hidden. Their account can still sign in.`,
      confirmLabel: activate ? "Activate" : "Deactivate",
      variant: activate ? "primary" : "danger",
    });
    if (!confirmed) return;
    await perform(() =>
      updateUser(user.id, { status: activate ? "active" : "draft" })
    );
  };

  const handleAccess = async (suspend: boolean) => {
    const confirmed = await confirm({
      title: suspend ? "Suspend account access?" : "Restore account access?",
      description: suspend
        ? `${current.firstName} ${current.lastName} will be signed out everywhere and blocked from signing in. Membership is not changed.`
        : `${current.firstName} ${current.lastName} will be able to sign in again.`,
      confirmLabel: suspend ? "Suspend" : "Restore",
      variant: suspend ? "danger" : "primary",
    });
    if (!confirmed) return;
    await perform(() =>
      updateUser(user.id, { accessState: suspend ? "suspended" : "active" })
    );
  };

  const handleOnboarding = async (complete: boolean) => {
    await perform(() =>
      updateUser(user.id, { onboardingCompleted: complete })
    );
  };

  const handleAvatar = async (file: File | undefined) => {
    if (!file) return;
    await perform(() => uploadAvatar(user.id, file));
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleRemoveAvatar = async () => {
    const confirmed = await confirm({
      title: "Remove profile photo?",
      description: "The member's public profile will fall back to their initials.",
      confirmLabel: "Remove",
      variant: "danger",
    });
    if (!confirmed) return;
    await perform(() => removeAvatar(user.id));
  };

  return (
    <Modal
      isOpen={!!user}
      onClose={onClose}
      title="User Details"
      description={`@${current.username || "no profile yet"}`}
      className="max-w-3xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => onEdit(current)}>Edit</Button>
        </>
      }
    >
      <div className="space-y-6">
        {error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative">
            {current.profilePhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={current.profilePhotoUrl}
                alt={`${current.firstName} ${current.lastName}`}
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-20 w-20 items-center justify-center rounded-full roicard-gradient text-xl font-bold text-roicard-on-primary">
                {`${current.firstName?.[0] ?? ""}${current.lastName?.[0] ?? ""}`.toUpperCase() || "U"}
              </span>
            )}
            {current.profilePhotoUrl && (
              <button
                type="button"
                title="Remove photo"
                disabled={acting}
                onClick={handleRemoveAvatar}
                className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full border border-roicard-border bg-roicard-bg-elevated text-red-400 shadow"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold text-roicard-text">
              {current.firstName} {current.lastName}
            </p>
            <p className="break-all text-sm text-roicard-text-muted">
              {current.email}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge tone={current.status === "active" ? "green" : "amber"}>
                {current.status === "active" ? "member active" : "membership draft"}
              </Badge>
              <Badge tone={current.isDeactivated ? "red" : "green"}>
                {current.isDeactivated ? "access suspended" : "access ok"}
              </Badge>
              <Badge tone={current.onboardingCompleted ? "green" : "amber"}>
                {current.onboardingCompleted ? "onboarding done" : "onboarding pending"}
              </Badge>
              <Badge tone={current.emailVerified ? "green" : "red"}>
                {current.emailVerified ? "email verified" : "email unverified"}
              </Badge>
              {current.role === "admin" && <Badge tone="neutral">admin</Badge>}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => handleAvatar(e.target.files?.[0])}
            />
            <Button
              variant="secondary"
              size="sm"
              disabled={acting}
              onClick={() => fileRef.current?.click()}
            >
              <Camera className="h-3.5 w-3.5" aria-hidden />
              {current.profilePhotoUrl ? "Replace photo" : "Upload photo"}
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-roicard-border bg-roicard-bg-muted px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-roicard-text-muted">
              Profile completion
            </p>
            <p className="mt-1 text-lg font-semibold text-roicard-text">
              {current.profileCompletionPct}%
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-roicard-border">
              <div
                className="h-full rounded-full bg-roicard-accent"
                style={{ width: `${Math.min(100, current.profileCompletionPct)}%` }}
              />
            </div>
          </div>
          <div className="rounded-xl border border-roicard-border bg-roicard-bg-muted px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-roicard-text-muted">
              Joined
            </p>
            <p className="mt-1 text-lg font-semibold text-roicard-text">
              {formatDate(current.joinedAt)}
            </p>
            <p className="mt-1 text-xs text-roicard-text-muted">
              Next step: {current.nextStep ?? "—"}
            </p>
          </div>
        </div>

        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-roicard-accent">
            Admin controls
          </h3>
          <div className="flex flex-wrap gap-2">
            {current.status === "active" ? (
              <Button
                variant="secondary"
                size="sm"
                disabled={acting}
                onClick={() => handleMembership(false)}
              >
                <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
                Deactivate membership
              </Button>
            ) : (
              <Button
                size="sm"
                disabled={acting}
                onClick={() => handleMembership(true)}
              >
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                Activate membership
              </Button>
            )}

            {current.isDeactivated ? (
              <Button
                variant="secondary"
                size="sm"
                disabled={acting}
                onClick={() => handleAccess(false)}
              >
                Restore account access
              </Button>
            ) : (
              <Button
                variant="danger"
                size="sm"
                disabled={acting}
                onClick={() => handleAccess(true)}
              >
                Suspend account access
              </Button>
            )}

            <Button
              variant="secondary"
              size="sm"
              disabled={acting}
              onClick={() => handleOnboarding(!current.onboardingCompleted)}
            >
              {current.onboardingCompleted
                ? "Reopen onboarding"
                : "Mark onboarding complete"}
            </Button>
          </div>
          <p className="text-xs text-roicard-text-muted">
            Admin activation marks the membership active and publishes the public
            profile. It never creates a payment record or claims a payment was made.
          </p>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-roicard-accent">
              Payment history
            </h3>
            {current.paymentSummary && (
              <p className="text-xs text-roicard-text-muted">
                {current.paymentSummary.successful} successful · GHS{" "}
                {current.paymentSummary.totalPaid.toFixed(2)}
              </p>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-6">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-roicard-border border-t-roicard-accent" />
            </div>
          ) : current.payments.length === 0 ? (
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-roicard-border px-4 py-4 text-sm text-roicard-text-muted">
              <CreditCard className="h-4 w-4" aria-hidden />
              No payments recorded. Admin activation is an explicit override and
              does not create a fake payment.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-roicard-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-roicard-bg-muted text-xs uppercase tracking-wider text-roicard-text-muted">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Amount</th>
                    <th className="px-3 py-2">Method</th>
                    <th className="px-3 py-2">Reference</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {current.payments.map((payment) => (
                    <tr key={payment.id} className="border-t border-roicard-border">
                      <td className="px-3 py-2 text-roicard-text-muted">
                        {formatDate(payment.createdAt)}
                      </td>
                      <td className="px-3 py-2 text-roicard-text">
                        {payment.currency} {payment.amount.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-roicard-text-muted">
                        {payment.method ?? "—"}
                        {payment.momoNumber ? ` · ${payment.momoNumber}` : ""}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-roicard-text-muted">
                        {payment.providerReference}
                      </td>
                      <td className="px-3 py-2">
                        <Badge
                          tone={
                            payment.status === "success"
                              ? "green"
                              : payment.status === "failed"
                                ? "red"
                                : "amber"
                          }
                        >
                          {payment.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </Modal>
  );
}
