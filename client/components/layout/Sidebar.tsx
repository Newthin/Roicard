"use client";

import { AdminDashboardNavLink } from "@/components/layout/AdminDashboardNavLink";
import { PublicProfileNavLink } from "@/components/layout/PublicProfileNavLink";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { cn } from "@/lib/cn";
import { DASHBOARD_NAV } from "@/lib/constants";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  const navContent = (
    <>
      <Link
        href="/dashboard"
        onClick={onClose}
        className="mb-8 flex flex-col gap-1.5 px-2 transition-opacity hover:opacity-90"
      >
        <BrandLogo height={26} />
      </Link>

      <nav className="space-y-1">
        {DASHBOARD_NAV.map(({ label, href, icon: Icon, exact }) => {
          const isActive = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium theme-transition",
                isActive
                  ? "bg-roicard-primary/15 text-roicard-text border border-roicard-primary/30 shadow-sm shadow-[var(--rc-shadow)]"
                  : "text-roicard-text-muted hover:bg-roicard-bg-muted hover:text-roicard-text"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5",
                  isActive ? "text-roicard-accent" : "text-roicard-text-muted"
                )}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      <PublicProfileNavLink onNavigate={onClose} />
      <AdminDashboardNavLink onNavigate={onClose} />
    </>
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-40 bg-[var(--rc-overlay)] lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-roicard-border bg-roicard-bg-elevated p-4 transition-transform duration-300 lg:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-roicard-text-muted hover:bg-roicard-bg-muted hover:text-roicard-text"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {navContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-roicard-border lg:bg-roicard-bg-elevated lg:p-6">
        {navContent}
      </aside>
    </>
  );
}

export function SidebarToggle({
  onOpen,
}: {
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="rounded-lg p-2 text-roicard-text-muted hover:bg-roicard-bg-muted hover:text-roicard-text lg:hidden"
      aria-label="Open menu"
    >
      <Menu className="h-5 w-5" />
    </button>
  );
}
