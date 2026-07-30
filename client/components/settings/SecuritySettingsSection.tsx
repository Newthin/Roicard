/**
 * SecuritySettingsSection
 *
 * Password change form, 2FA toggle, and mock login sessions.
 */

"use client";

import { FormField } from "@/components/onboarding/FormField";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import {
  getMockLoginSessions,
  getSecurityPreferences,
  saveSecurityPreferences,
} from "@/lib/settings/storage";
import { cn } from "@/lib/cn";
import { Monitor, Shield } from "lucide-react";
import { FormEvent, useState } from "react";

export function SecuritySettingsSection() {
  const { confirm } = useConfirm();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(
    () => getSecurityPreferences().twoFactorEnabled
  );

  const sessions = getMockLoginSessions();

  /** Mock password change with confirmation and basic validation. */
  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All password fields are required.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    const confirmed = await confirm({
      title: "Update password?",
      description: "You will need to use your new password on next sign in (demo).",
      confirmLabel: "Update Password",
    });

    if (!confirmed) return;

    setIsSavingPassword(true);
    setTimeout(() => {
      setIsSavingPassword(false);
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }, 600);
  };

  /** Toggles 2FA preference — confirms when disabling. */
  const handleToggle2FA = async () => {
    if (twoFactorEnabled) {
      const confirmed = await confirm({
        title: "Disable two-factor authentication?",
        description:
          "Your account will be less secure without 2FA enabled (demo).",
        confirmLabel: "Disable 2FA",
        variant: "danger",
      });
      if (!confirmed) return;
    } else {
      const confirmed = await confirm({
        title: "Enable two-factor authentication?",
        description: "Add an extra layer of security to your account (demo).",
        confirmLabel: "Enable 2FA",
      });
      if (!confirmed) return;
    }

    const next = !twoFactorEnabled;
    setTwoFactorEnabled(next);
    saveSecurityPreferences({ twoFactorEnabled: next });
  };

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Change Password"
        description="Update your password to keep your account secure."
      >
        <form className="space-y-5" onSubmit={handlePasswordSubmit} noValidate>
          <FormField
            label="Current Password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <FormField
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <FormField
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          {passwordError && (
            <p className="text-sm text-red-400" role="alert">
              {passwordError}
            </p>
          )}
          {passwordSuccess && (
            <p className="text-sm text-emerald-400" role="status">
              Password updated successfully (demo).
            </p>
          )}

          <Button
            type="submit"
            isLoading={isSavingPassword}
            className="rounded-xl"
          >
            Update Password
          </Button>
        </form>
      </SettingsSection>

      <SettingsSection
        title="Two-Factor Authentication"
        description="Add an extra layer of security to your account."
      >
        <div className="flex items-center justify-between gap-4 rounded-xl border border-roicard-border bg-roicard-bg-muted/40 p-4">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-roicard-accent" aria-hidden />
            <div>
              <p className="text-sm font-medium text-roicard-text">
                Two-factor authentication
              </p>
              <p className="text-xs text-roicard-text-muted">
                {twoFactorEnabled ? "Enabled" : "Disabled"} — UI only
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={twoFactorEnabled}
            onClick={handleToggle2FA}
            className={cn(
              "relative h-7 w-12 rounded-full transition-colors",
              twoFactorEnabled ? "bg-roicard-primary" : "bg-roicard-bg-muted"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-6 w-6 rounded-full bg-white transition-transform",
                twoFactorEnabled ? "left-5" : "left-0.5"
              )}
            />
          </button>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Login Sessions"
        description="Devices where you're currently signed in."
      >
        <ul className="space-y-3">
          {sessions.map((session) => (
            <li
              key={session.id}
              className="flex items-start gap-3 rounded-xl border border-roicard-border bg-roicard-bg-muted/30 p-4"
            >
              <Monitor className="mt-0.5 h-5 w-5 shrink-0 text-roicard-accent" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-roicard-text">
                  {session.device}
                  {session.current && (
                    <span className="ml-2 text-xs text-emerald-400">
                      (This device)
                    </span>
                  )}
                </p>
                <p className="text-xs text-roicard-text-muted">
                  {session.location} · {session.lastActive}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </SettingsSection>
    </div>
  );
}
