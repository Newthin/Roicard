/**
 * SettingsView
 *
 * Tabbed settings interface — profile, account, security, danger zone.
 * Route: /dashboard/settings
 */

"use client";

import { AccountSettingsSection } from "@/components/settings/AccountSettingsSection";
import { BillingPanel } from "@/components/settings/BillingPanel";
import { DangerZoneCard } from "@/components/settings/DangerZoneCard";
import {
  getDefaultProfileFormData,
  ProfileSettingsForm,
} from "@/components/settings/ProfileSettingsForm";
import { SecuritySettingsSection } from "@/components/settings/SecuritySettingsSection";
import { SettingsTabs } from "@/components/settings/SettingsTabs";
import { getCurrentUserProfile } from "@/lib/profile/storage";
import type { OnboardingFormData } from "@/lib/profile/types";
import type { SettingsTab } from "@/lib/settings/types";
import { useCallback, useEffect, useState } from "react";

export function SettingsView() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [profileData, setProfileData] = useState<OnboardingFormData>(
    getDefaultProfileFormData()
  );
  const [isLoaded, setIsLoaded] = useState(false);

  /** Loads profile from API on mount. */
  const loadProfile = useCallback(async () => {
    try {
      const profile = await getCurrentUserProfile();
      if (profile) {
        const { username, createdAt, membershipStatus, ...formData } = profile;
        setProfileData({
          ...getDefaultProfileFormData(),
          ...formData,
        });
      }
    } catch {
      // No real profile loaded — keep the default empty form state.
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadProfile();

    // Deep link support: /dashboard/settings?tab=billing (used by emails and
    // upgrade prompts).
    if (typeof window !== "undefined") {
      const tab = new URLSearchParams(window.location.search).get("tab");
      if (
        tab === "profile" ||
        tab === "account" ||
        tab === "billing" ||
        tab === "security" ||
        tab === "danger"
      ) {
        setActiveTab(tab as import("@/lib/settings/types").SettingsTab);
      }
    }
  }, [loadProfile]);

  /** Renders the active tab panel content. */
  const renderPanel = () => {
    switch (activeTab) {
      case "profile":
        return (
          <ProfileSettingsForm
            initialData={profileData}
            onSaved={loadProfile}
          />
        );
      case "account":
        return <AccountSettingsSection />;
      case "billing":
        return <BillingPanel />;
      case "security":
        return <SecuritySettingsSection />;
      case "danger":
        return <DangerZoneCard />;
      default:
        return null;
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-roicard-border border-t-roicard-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-roicard-text">Settings</h1>
        <p className="mt-1 text-sm text-roicard-text-muted">
          Manage your profile, account, and security preferences
        </p>
      </div>

      <SettingsTabs activeTab={activeTab} onChange={setActiveTab} />

      <div role="tabpanel">{renderPanel()}</div>
    </div>
  );
}
