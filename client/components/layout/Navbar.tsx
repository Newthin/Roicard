"use client";

import { SidebarToggle } from "@/components/layout/Sidebar";
import { ThemeToggle } from "@/components/theme";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { useAuth } from "@/contexts/AuthContext";
import { PLACEHOLDER_USER } from "@/lib/constants";
import { Bell, LogOut } from "lucide-react";

type NavbarProps = {
  onMenuOpen: () => void;
};

export function Navbar({ onMenuOpen }: NavbarProps) {
  const { logout, user } = useAuth();
  const { confirm } = useConfirm();

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
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-roicard-border header-surface px-4 backdrop-blur-sm theme-transition lg:px-6">
      <div className="flex items-center gap-3">
        <SidebarToggle onOpen={onMenuOpen} />
        <div className="lg:hidden">
          <BrandLogo height={20} />
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <ThemeToggle compact className="shrink-0" />

        <button
          type="button"
          className="relative rounded-lg p-2 text-roicard-text-muted transition-colors hover:bg-roicard-bg-muted hover:text-roicard-text"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-roicard-primary" />
        </button>

        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg p-2 text-roicard-text-muted transition-colors hover:bg-roicard-bg-muted hover:text-roicard-text"
          aria-label="Log out"
        >
          <LogOut className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-roicard-text">
              {user ? `${user.first_name} ${user.last_name}` : PLACEHOLDER_USER.name}
            </p>
            <p className="text-xs text-roicard-text-muted">
              {user?.email || PLACEHOLDER_USER.email}
            </p>
          </div>
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full roicard-gradient text-sm font-semibold text-roicard-on-primary"
            aria-hidden
          >
            {user ? `${user.first_name[0]}${user.last_name[0]}` : PLACEHOLDER_USER.avatarInitials}
          </div>
        </div>
      </div>
    </header>
  );
}
