/**
 * AdminSidebar
 *
 * Left navigation for the admin control panel.
 * Separate from the user dashboard sidebar.
 */

"use client";

import { BrandLogo } from "@/components/ui/BrandLogo";
import { ADMIN_NAV } from "@/lib/admin/constants";
import { cn } from "@/lib/cn";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type AdminSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();

  const nav = (
    <>
      <Link
        href="/admin"
        onClick={onClose}
        className="mb-8 flex flex-col gap-1.5 px-2"
      >
        <BrandLogo height={26} />
        <p className="text-xs text-roicard-text-muted">Admin Console</p>
      </Link>

      <nav className="space-y-1">
        {ADMIN_NAV.map(({ label, href, icon: Icon, exact }) => {
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
                  ? "bg-roicard-bg-muted text-roicard-text border border-roicard-border shadow-sm shadow-[var(--rc-shadow)]"
                  : "text-roicard-text-muted hover:bg-roicard-bg-muted/60 hover:text-roicard-text"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 border-t border-roicard-border pt-4">
        <Link
          href="/dashboard"
          className="text-sm text-roicard-text-muted hover:text-roicard-accent"
        >
          ← Back to user dashboard
        </Link>
      </div>
    </>
  );

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-40 bg-[var(--rc-overlay)] lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-roicard-border bg-roicard-bg-elevated p-4 transition-transform lg:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-roicard-text-muted hover:text-roicard-text"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {nav}
      </aside>

      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-60 lg:flex-col lg:border-r lg:border-roicard-border lg:bg-roicard-bg-elevated lg:p-5">
        {nav}
      </aside>
    </>
  );
}

export function AdminSidebarToggle({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="rounded-lg p-2 text-roicard-text-muted hover:bg-roicard-bg-muted lg:hidden"
      aria-label="Open menu"
    >
      <Menu className="h-5 w-5" />
    </button>
  );
}
