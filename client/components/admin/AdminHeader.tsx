/**
 * AdminHeader
 *
 * Top header bar for admin pages with identity placeholder and theme toggle.
 */

"use client";

import { AdminSidebarToggle } from "@/components/admin/AdminSidebar";
import { ThemeToggle } from "@/components/theme";
import { ADMIN_IDENTITY } from "@/lib/admin/constants";
import { Bell } from "lucide-react";

type AdminHeaderProps = {
  onMenuOpen: () => void;
};

export function AdminHeader({ onMenuOpen }: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-roicard-border header-surface px-4 backdrop-blur-sm theme-transition lg:px-6">
      <div className="flex items-center gap-3">
        <AdminSidebarToggle onOpen={onMenuOpen} />
        <p className="text-sm font-medium text-roicard-text-muted lg:hidden">
          Admin Console
        </p>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <ThemeToggle compact />
        <button
          type="button"
          className="rounded-lg p-2 text-roicard-text-muted hover:bg-roicard-bg-muted hover:text-roicard-text"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-roicard-text">
              {ADMIN_IDENTITY.name}
            </p>
            <p className="text-xs text-roicard-text-muted">
              {ADMIN_IDENTITY.role}
            </p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-roicard-border bg-roicard-bg-muted text-xs font-bold text-roicard-accent">
            {ADMIN_IDENTITY.initials}
          </div>
        </div>
      </div>
    </header>
  );
}
