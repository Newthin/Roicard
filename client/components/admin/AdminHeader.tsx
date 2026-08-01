/**
 * AdminHeader
 *
 * Top header bar for admin pages with identity and theme toggle.
 */

"use client";

import { AdminSidebarToggle } from "@/components/admin/AdminSidebar";
import { ThemeToggle } from "@/components/theme";
import { useAuth } from "@/contexts/AuthContext";
import { getCurrentUserProfile, getCurrentUserProfileSync } from "@/lib/profile/storage";
import { useEffect, useState } from "react";
import { NotificationBell } from "@/components/notifications/NotificationBell";

type AdminHeaderProps = {
  onMenuOpen: () => void;
};

export function AdminHeader({ onMenuOpen }: AdminHeaderProps) {
  const { user } = useAuth();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const loadPhoto = () => {
    const profile = getCurrentUserProfileSync();
    if (profile?.profilePhotoUrl) {
      setPhotoUrl(profile.profilePhotoUrl);
      return;
    }
    // Fallback: fetch from API (for users who uploaded avatar outside onboarding)
    getCurrentUserProfile().then((p) => {
      if (p?.profilePhotoUrl) setPhotoUrl(p.profilePhotoUrl);
    });
  };

  useEffect(() => {
    loadPhoto();
    const handler = () => loadPhoto();
    window.addEventListener("storage", handler);
    window.addEventListener("profile-photo-changed", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("profile-photo-changed", handler);
    };
  }, []);

  const displayName = user ? `${user.first_name} ${user.last_name}` : "Admin";
  const initials = user
    ? `${user.first_name[0]}${user.last_name[0]}`
    : "AD";

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
        <NotificationBell />
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-roicard-text">
              {displayName}
            </p>
            <p className="text-xs text-roicard-text-muted">Administrator</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-roicard-border bg-roicard-bg-muted text-xs font-bold text-roicard-accent">
            {photoUrl ? (
              <img src={photoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
