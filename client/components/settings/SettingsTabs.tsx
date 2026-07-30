/**
 * SettingsTabs
 *
 * Tab navigation for the settings page sections.
 * Horizontally scrollable on mobile, inline on desktop.
 */

"use client";

import { cn } from "@/lib/cn";
import type { SettingsTab } from "@/lib/settings/types";
import { AlertTriangle, Lock, User, UserCircle } from "lucide-react";

const TABS: {
  id: SettingsTab;
  label: string;
  icon: typeof User;
}[] = [
  { id: "profile", label: "Profile", icon: UserCircle },
  { id: "account", label: "Account", icon: User },
  { id: "security", label: "Security", icon: Lock },
  { id: "danger", label: "Danger Zone", icon: AlertTriangle },
];

type SettingsTabsProps = {
  activeTab: SettingsTab;
  onChange: (tab: SettingsTab) => void;
};

export function SettingsTabs({ activeTab, onChange }: SettingsTabsProps) {
  return (
    <nav
      className="flex gap-2 overflow-x-auto border-b border-roicard-border pb-4 scrollbar-none"
      role="tablist"
      aria-label="Settings sections"
    >
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={activeTab === id}
          onClick={() => onChange(id)}
          className={cn(
            "inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
            activeTab === id
              ? "bg-roicard-primary/15 text-roicard-text border border-roicard-primary/30"
              : "border border-transparent text-roicard-text-muted hover:bg-roicard-bg-muted hover:text-roicard-text",
            id === "danger" &&
              activeTab === id &&
              "border-red-500/30 bg-red-500/10"
          )}
        >
          <Icon
            className={cn(
              "h-4 w-4",
              id === "danger" && activeTab === id
                ? "text-red-400"
                : activeTab === id
                  ? "text-roicard-accent"
                  : "text-roicard-text-muted"
            )}
            aria-hidden
          />
          {label}
        </button>
      ))}
    </nav>
  );
}
