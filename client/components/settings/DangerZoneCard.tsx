/**
 * DangerZoneCard
 *
 * Destructive account actions — delete and deactivate.
 * Both require the current password and are persisted server-side.
 */

"use client";

import { FormField } from "@/components/onboarding/FormField";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { useAuth } from "@/contexts/AuthContext";
import { deactivateAccount, deleteAccount } from "@/lib/api/auth";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";

export function DangerZoneCard() {
  const { logout } = useAuth();
  const { confirm } = useConfirm();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deactivatePassword, setDeactivatePassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  /** Permanently deletes the account and signs the user out. */
  const handleDeleteAccount = async () => {
    setDeleteError(null);
    setMessage(null);
    if (!deletePassword) {
      setDeleteError("Enter your current password to delete your account.");
      return;
    }

    const confirmed = await confirm({
      title: "Delete your account?",
      description:
        "This action is permanent and cannot be undone. All your profile data, connections, and analytics will be removed. You will be signed out immediately.",
      confirmLabel: "Delete Forever",
      variant: "danger",
    });

    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await deleteAccount(deletePassword);
      setMessage("Account permanently deleted.");
      logout();
    } catch (err: unknown) {
      const data =
        err && typeof err === "object" && "response" in err
          ? (err as { response: { data: { message?: string } } }).response?.data
          : null;
      setDeleteError(
        data?.message || "Unable to delete account. Please try again."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  /** Deactivates the account (hides profile) and signs the user out. */
  const handleDeactivate = async () => {
    setDeactivateError(null);
    setMessage(null);
    if (!deactivatePassword) {
      setDeactivateError("Enter your current password to deactivate.");
      return;
    }

    const confirmed = await confirm({
      title: "Deactivate your account?",
      description:
        "Your profile will be hidden from public view and you'll be signed out. You can reactivate later by signing in again.",
      confirmLabel: "Deactivate",
      variant: "danger",
    });

    if (!confirmed) return;

    setIsDeactivating(true);
    try {
      await deactivateAccount(deactivatePassword);
      setMessage("Account deactivated. Your profile is hidden.");
      logout();
    } catch (err: unknown) {
      const data =
        err && typeof err === "object" && "response" in err
          ? (err as { response: { data: { message?: string } } }).response?.data
          : null;
      setDeactivateError(
        data?.message || "Unable to deactivate account. Please try again."
      );
    } finally {
      setIsDeactivating(false);
    }
  };

  return (
    <SettingsSection
      title="Danger Zone"
      description="Irreversible and destructive actions."
      className="border-red-500/20"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/5 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
          <p className="text-sm text-roicard-text-muted">
            This action is permanent and cannot be undone. Deleting your account
            will remove your profile, connections, and all associated data.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-roicard-text">Delete Account</p>
            <p className="text-xs text-roicard-text-muted">
              Permanently remove your ROICARD account
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <FormField
              label="Current Password"
              type="password"
              value={deletePassword}
              onChange={(e) => {
                setDeletePassword(e.target.value);
                setDeleteError(null);
              }}
              className="sm:w-56"
            />
            <Button
              variant="danger"
              onClick={handleDeleteAccount}
              isLoading={isDeleting}
              className="rounded-xl sm:min-w-[160px]"
            >
              Delete Account
            </Button>
          </div>
        </div>
        {deleteError && (
          <p className="text-sm text-red-400" role="alert">
            {deleteError}
          </p>
        )}

        <div className="border-t border-roicard-border pt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-roicard-text">
                Deactivate Account
              </p>
              <p className="text-xs text-roicard-text-muted">
                Temporarily hide your profile and sign out
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <FormField
                label="Current Password"
                type="password"
                value={deactivatePassword}
                onChange={(e) => {
                  setDeactivatePassword(e.target.value);
                  setDeactivateError(null);
                }}
                className="sm:w-56"
              />
              <Button
                variant="secondary"
                onClick={handleDeactivate}
                isLoading={isDeactivating}
                disabled={isDeactivating}
                className="rounded-xl sm:min-w-[160px]"
              >
                Deactivate Account
              </Button>
            </div>
          </div>
          {deactivateError && (
            <p className="mt-3 text-sm text-red-400" role="alert">
              {deactivateError}
            </p>
          )}
          {message && (
            <p className="mt-3 text-sm text-roicard-accent" role="status">
              {message}
            </p>
          )}
        </div>
      </div>
    </SettingsSection>
  );
}