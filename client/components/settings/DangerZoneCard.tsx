/**
 * DangerZoneCard
 *
 * Destructive account actions — delete and deactivate.
 * All actions require confirmation via the global confirm dialog.
 */

"use client";

import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { useAuth } from "@/contexts/AuthContext";
import { deleteCurrentUserProfile } from "@/lib/profile/storage";
import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function DangerZoneCard() {
  const router = useRouter();
  const { logout } = useAuth();
  const { confirm } = useConfirm();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deactivated, setDeactivated] = useState(false);

  /** Permanently deletes profile and logs user out. */
  const handleDeleteAccount = async () => {
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
      await deleteCurrentUserProfile();
      logout();
    } catch {
      setIsDeleting(false);
    }
  };

  /** UI-only deactivate — requires confirmation before proceeding. */
  const handleDeactivate = async () => {
    const confirmed = await confirm({
      title: "Deactivate your account?",
      description:
        "Your profile will be hidden from public view. You can reactivate later (demo).",
      confirmLabel: "Deactivate",
      variant: "danger",
    });

    if (!confirmed) return;
    setDeactivated(true);
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
          <div>
            <p className="text-sm font-medium text-roicard-text">Delete Account</p>
            <p className="text-xs text-roicard-text-muted">
              Permanently remove your ROICARD account
            </p>
          </div>
          <Button
            variant="danger"
            onClick={handleDeleteAccount}
            isLoading={isDeleting}
            className="rounded-xl sm:min-w-[160px]"
          >
            Delete Account
          </Button>
        </div>

        <div className="border-t border-roicard-border pt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-roicard-text">
                Deactivate Account
              </p>
              <p className="text-xs text-roicard-text-muted">
                Temporarily hide your profile (UI only)
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={handleDeactivate}
              disabled={deactivated}
              className="rounded-xl sm:min-w-[160px]"
            >
              {deactivated ? "Deactivated" : "Deactivate Account"}
            </Button>
          </div>
          {deactivated && (
            <p className="mt-3 text-sm text-roicard-accent" role="status">
              Account deactivated (demo). Your profile is hidden from public view.
            </p>
          )}
        </div>
      </div>
    </SettingsSection>
  );
}
