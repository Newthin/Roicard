/**
 * Admin navigation items for the admin sidebar.
 */

import {
  BarChart3,
  CreditCard,
  LayoutDashboard,
  Nfc,
  Users,
  type LucideIcon,
} from "lucide-react";

export type AdminNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
};

export const ADMIN_NAV: AdminNavItem[] = [
  { label: "Dashboard Overview", href: "/admin", icon: LayoutDashboard, exact: true },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Generate Card", href: "/admin/cards/generate", icon: CreditCard },
  { label: "Roicard Management", href: "/admin/nfc", icon: Nfc },
  { label: "Statistics", href: "/admin/statistics", icon: BarChart3 },
];

export const ADMIN_IDENTITY = {
  name: "Admin User",
  role: "Platform Administrator",
  initials: "AU",
};
