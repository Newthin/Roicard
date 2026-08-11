/**
 * AccountSettingsSection
 *
 * Email, username management, and logout.
 * Persists changes via the backend account endpoint.
 */

"use client";

import { FormField } from "@/components/onboarding/FormField";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { useAuth } from "@/contexts/AuthContext";
import { updateAccount } from "@/lib/api/auth";
import { getCurrentUserProfile } from "@/lib/profile/storage";
import { formatHandle } from "@/lib/profile/helpers";
import { LogOut, Mail, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function AccountSettingsSection() {
  const router = useRouter();
  const { logout, user } = useAuth();
  const { confirm } = useConfirm();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    getCurrentUserProfile().then((profile) => {
      if (profile) {
        setEmail(profile.email || "");
        setUsername(profile.username || "");
      }
      setIsLoaded(true);
    });
  }, []);

  /** Saves email/username changes via the account API. */
  const handleSave = async () => {
    const confirmed = await confirm({
      title: "Save account changes?",
      description:
        "Your email and username will be updated. If you change your email you must verify it before you can sign in again.",
      confirmLabel: "Save Changes",
    });

    if (!confirmed) return;

    setIsSaving(true);
    setMessage(null);
    setError(null);
    try {
      const result = await updateAccount({
        email,
        username: username.trim().toLowerCase(),
      });
      setMessage(result.message);
      // Re-fetch the cached profile so downstream views (navbar, dashboard)
      // pick up the new username/slug immediately.
      await getCurrentUserProfile();
      // Keep the interceptor's identity headers aligned with the new email,
      // otherwise the next /me call would flag a (now legitimate) mismatch.
      localStorage.setItem("roicard_user", JSON.stringify(result.user));
    } catch (err: unknown) {
      const data =
        err && typeof err === "object" && "response" in err
          ? (err as { response: { data: { message?: string } } }).response?.data
          : null;
      setError(data?.message || "Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  /** Revokes the server token and redirects to login after confirmation. */
  const handleLogout = async () => {
    const confirmed = await confirm({
      title: "Log out?",
      description:
        "You will be signed out of your ROICARD account on this device.",
      confirmLabel: "Log Out",
      variant: "danger",
    });

    if (!confirmed) return;
    logout();
  };

  return (
    <div className="space-y-6">
      {/* Current account info card */}
      <SettingsSection
        title="Account Information"
        description="Your current account details at a glance."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-xl border border-roicard-border bg-roicard-bg-muted/40 p-4">
            <Mail className="h-5 w-5 text-roicard-accent" aria-hidden />
            <div>
              <p className="text-xs text-roicard-text-muted">Email</p>
              <p className="text-sm font-medium text-roicard-text">
                {email || (user?.email ?? "Not set")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-roicard-border bg-roicard-bg-muted/40 p-4">
            <User className="h-5 w-5 text-roicard-accent" aria-hidden />
            <div>
              <p className="text-xs text-roicard-text-muted">Username</p>
              <p className="text-sm font-medium text-roicard-text">
                {username ? formatHandle(username) : "Not set"}
              </p>
            </div>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Update Account"
        description="Change your email or public profile URL."
      >
        <div className="space-y-5">
          <FormField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setMessage(null);
              setError(null);
            }}
          />
          <FormField
            label="Username"
            value={username}
            hint="Your public profile URL: /username — lowercase letters and dashes only"
            onChange={(e) => {
              setUsername(e.target.value);
              setMessage(null);
              setError(null);
            }}
          />
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-400" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="mt-4 text-sm text-emerald-400" role="status">
            {message}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button
            onClick={handleSave}
            isLoading={isSaving}
            className="rounded-xl"
          >
            Save Changes
          </Button>
          <Button
            variant="secondary"
            onClick={handleLogout}
            className="rounded-xl"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </SettingsSection>
    </div>
  );
}