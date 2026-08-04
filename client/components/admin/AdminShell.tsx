/**
 * AdminShell
 *
 * Layout wrapper for all /admin routes — sidebar + header + main content.
 */

"use client";

import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { ReactNode, useState } from "react";

type AdminShellProps = {
  children: ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-roicard-bg print:bg-white">
      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="lg:pl-60 print:pl-0">
        <AdminHeader onMenuOpen={() => setSidebarOpen(true)} />
        <main className="p-4 lg:p-8 print:p-0">{children}</main>
      </div>
    </div>
  );
}
