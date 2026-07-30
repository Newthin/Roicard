"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { ReactNode, useState } from "react";
import { usePathname } from "next/navigation";

type DashboardShellProps = {
  children: ReactNode;
};

export function DashboardShell({ children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Onboarding uses its own full-screen layout without sidebar/navbar
  const isOnboarding = pathname.startsWith("/dashboard/onboarding");

  if (isOnboarding) {
    return <div className="min-h-screen bg-roicard-bg">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-roicard-bg">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-64">
        <Navbar onMenuOpen={() => setSidebarOpen(true)} />
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
