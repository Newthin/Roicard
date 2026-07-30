/**
 * AccountSettingsSection
 *
 * Email, username management, and logout.
 * Updates mock profile storage on save.
 */

"use client";

import { FormField } from "@/components/onboarding/FormField";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { useAuth } from "@/contexts/AuthContext";
import { PLACEHOLDER_USER } from "@/lib/constants";
import {
  getCurrentUserProfile,
  updateCurrentUserProfile,
} from "@/lib/profile/storage";
import { formatHandle } from "@/lib/profile/helpers";
import { LogOut, Mail, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function AccountSettingsSection() {
  const router = useRouter();
  const { logout, user } = useAuth();
  const { confirm } = useConfirm();

  const [email, setEmail] = useState(PLACEHOLDER_USER.email);
  const [username, setUsername] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    getCurrentUserProfile().then((profile) => {
      if (profile) {
        setEmail(profile.email || PLACEHOLDER_USER.email);
        setUsername(profile.username || "");
      }
      setIsLoaded(true);
    });
  }, []);

  /** Saves email/username changes via API. */
  const handleSave = async () => {
    const confirmed = await confirm({
      title: "Save account changes?",
      description: "Your email and username will be updated.",
      confirmLabel: "Save Changes",
    });

    if (!confirmed) return;

    setIsSaving(true);
    try {
      await updateCurrentUserProfile({
        email,
        username: username.trim().toLowerCase(),
      });
      setMessage("Account settings updated.");
    } catch {
      setMessage("Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  /** Clears mock auth and redirects to login after confirmation. */
  const handleLogout = async () => {
    const confirmed = await confirm({
      title: "Log out?",
      description: "You will be signed out of your ROICARD account on this device.",
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
              <p className="text-sm font-medium text-roicard-text">{email}</p>
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
        description="Change your email or public username (UI only)."
      >
        <div className="space-y-5">
          <FormField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setMessage(null);
            }}
          />
          <FormField
            label="Username"
            value={username}
            hint="Your public profile URL: /username"
            onChange={(e) => {
              setUsername(e.target.value);
              setMessage(null);
            }}
          />
        </div>

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
