/**
 * SecuritySettingsSection
 *
 * Real password change, two-factor authentication setup/teardown.
 * No mock controls — everything talks to the backend.
 */

"use client";

import { FormField } from "@/components/onboarding/FormField";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import {
  changePassword,
  getTwoFactorStatus,
  twoFactorConfirm,
  twoFactorDisable,
  twoFactorSetup,
  type TwoFactorStatus,
} from "@/lib/api/auth";
import { cn } from "@/lib/cn";
import { Check, Shield } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

export function SecuritySettingsSection() {
  const { confirm } = useConfirm();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [status, setStatus] = useState<TwoFactorStatus>({
    enabled: false,
    has_pending_secret: false,
  });
  const [statusLoaded, setStatusLoaded] = useState(false);
  const [setupPending, setSetupPending] = useState(false);
  const [setupSecret, setSetupSecret] = useState("");
  const [setupUrl, setSetupUrl] = useState("");
  const [setupPassword, setSetupPassword] = useState("");
  const [code, setCode] = useState("");
  const [twoFactorMessage, setTwoFactorMessage] = useState<string | null>(null);
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);
  const [isTwoFactorBusy, setIsTwoFactorBusy] = useState(false);

  const refreshStatus = async () => {
    try {
      setStatus(await getTwoFactorStatus());
    } catch {
      // status panel remains in its initial "unknown" state
    } finally {
      setStatusLoaded(true);
    }
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  /** Real password change with confirm dialog. */
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
      description:
        "You will be signed out of every other device. You'll use the new password on your next sign-in.",
      confirmLabel: "Update Password",
    });

    if (!confirmed) return;

    setIsSavingPassword(true);
    try {
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: confirmPassword,
      });
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const data =
        err && typeof err === "object" && "response" in err
          ? (err as { response: { data: { message?: string } } }).response?.data
          : null;
      setPasswordError(data?.message || "Unable to update password.");
    } finally {
      setIsSavingPassword(false);
    }
  };

  /** Starts 2FA setup (requires current password). */
  const handleSetupStart = async () => {
    setTwoFactorError(null);
    setTwoFactorMessage(null);
    if (!setupPassword) {
      setTwoFactorError("Enter your current password to begin setup.");
      return;
    }

    setIsTwoFactorBusy(true);
    try {
      const { secret, otpauth_url } = await twoFactorSetup(setupPassword);
      setSetupSecret(secret);
      setSetupUrl(otpauth_url);
      setSetupPending(true);
    } catch (err: unknown) {
      const data =
        err && typeof err === "object" && "response" in err
          ? (err as { response: { data: { message?: string } } }).response?.data
          : null;
      setTwoFactorError(data?.message || "Unable to start two-factor setup.");
    } finally {
      setIsTwoFactorBusy(false);
    }
  };

  const [twoFactorSetupUrl, setTwoFactorSetupUrl] = useState("");

  /** Confirms setup with a valid code. */
  const handleSetupConfirm = async () => {
    setTwoFactorError(null);
    setTwoFactorMessage(null);
    if (!code) {
      setTwoFactorError("Enter the 6-digit code from your authenticator app.");
      return;
    }

    setIsTwoFactorBusy(true);
    try {
      const result = await twoFactorConfirm(code);
      setSetupPending(false);
      setSetupSecret("");
      setSetupUrl("");
      setSetupPassword("");
      setCode("");
      setTwoFactorMessage(result.message);
      await refreshStatus();
    } catch (err: unknown) {
      const data =
        err && typeof err === "object" && "response" in err
          ? (err as { response: { data: { message?: string } } }).response?.data
          : null;
      setTwoFactorError(data?.message || "Invalid verification code.");
    } finally {
      setIsTwoFactorBusy(false);
    }
  };

  /** Disables 2FA after confirming. */
  const handleDisable = async () => {
    const confirmed = await confirm({
      title: "Disable two-factor authentication?",
      description:
        "Your account will be less secure without 2FA enabled. Enter a current code or your password to confirm.",
      confirmLabel: "Disable 2FA",
      variant: "danger",
    });

    if (!confirmed) return;

    setIsTwoFactorBusy(true);
    setTwoFactorMessage(null);
    setTwoFactorError(null);
    try {
      const result = await twoFactorDisable(
        code
          ? { code }
          : { current_password: setupPassword || undefined }
      );
      setTwoFactorMessage(result.message);
      setCode("");
      setSetupPassword("");
      await refreshStatus();
    } catch (err: unknown) {
      const data =
        err && typeof err === "object" && "response" in err
          ? (err as { response: { data: { message?: string } } }).response
              ?.data
          : null;
      setTwoFactorError(
        data?.message || "Unable to disable two-factor authentication."
      );
} finally {
      setIsTwoFactorBusy(false);
    }
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
              Password updated successfully. You'll be signed out of other
              devices.
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
                {!statusLoaded
                  ? "Checking status…"
                  : status.enabled
                    ? "Enabled"
                    : "Disabled"}
              </p>
            </div>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
              status.enabled
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-roicard-bg-muted text-roicard-text-muted"
            )}
          >
            {status.enabled && <Check className="h-3 w-3" aria-hidden />}
            {status.enabled ? "Enabled" : "Off"}
          </span>
        </div>

        {twoFactorError && (
          <p className="mt-3 text-sm text-red-400" role="alert">
            {twoFactorError}
          </p>
        )}
        {twoFactorMessage && (
          <p className="mt-3 text-sm text-emerald-400" role="status">
            {twoFactorMessage}
          </p>
        )}

        {!status.enabled && !setupPending && (
          <div className="mt-4 space-y-4">
            <FormField
              label="Confirm with current password"
              type="password"
              value={setupPassword}
              onChange={(e) => {
                setSetupPassword(e.target.value);
                setTwoFactorError(null);
              }}
            />
            <Button
              onClick={handleSetupStart}
              isLoading={isTwoFactorBusy}
              className="rounded-xl"
            >
              Enable Two-Factor Authentication
            </Button>
          </div>
        )}

        {setupPending && (
          <div className="mt-4 space-y-4 rounded-xl border border-roicard-border bg-roicard-bg-muted/20 p-4">
            <p className="text-sm text-roicard-text-muted">
              Scan this code in your authenticator app (Google Authenticator,
              Authy, 1Password) or enter the secret manually:
            </p>
            <div>
              <p className="mb-1 text-xs font-medium text-roicard-text-muted">
                Setup key
              </p>
              {setupUrl && (
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                    setupUrl
                  )}`}
                  alt="QR code for two-factor authentication"
                  width={180}
                  height={180}
                  className="rounded-lg border border-roicard-border"
                />
              )}
              <p className="mt-2 break-all font-mono text-sm text-roicard-text">
                {setupSecret}
              </p>
            </div>
            <FormField
              label="Enter the 6-digit code"
              value={code}
              inputMode="numeric"
              maxLength={6}
              onChange={(e) => setCode(e.target.value)}
            />
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={handleSetupConfirm}
                isLoading={isTwoFactorBusy}
                className="rounded-xl"
              >
                Confirm & Enable
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setSetupPending(false);
                  setSetupSecret("");
                  setSetupUrl("");
                  setSetupPassword("");
                  setCode("");
                }}
                className="rounded-xl"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {status.enabled && (
          <div className="mt-4">
            <Button
              variant="secondary"
              onClick={handleDisable}
              isLoading={isTwoFactorBusy}
              className="rounded-xl"
            >
              Disable Two-Factor Authentication
            </Button>
          </div>
        )}
      </SettingsSection>
    </div>
  );
}