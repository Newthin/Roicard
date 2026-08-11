import {
  BarChart3,
  LayoutDashboard,
  Link2,
  Settings,
  User,
  type LucideIcon,
} from "lucide-react";

export const BRAND = {
  /** Accent and CTA colors are theme-stable; surfaces use CSS variables in globals.css */
  accentOrange: "#FF8C42",
  primaryRed: "#E63946",
  gradient: "linear-gradient(135deg, #E63946 0%, #EF6B35 50%, #FF8C42 100%)",
} as const;

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** When true, only exact pathname match counts as active (e.g. /dashboard home) */
  exact?: boolean;
};

export const DASHBOARD_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, exact: true },
  { label: "Profile", href: "/dashboard/profile", icon: User },
  { label: "Connections", href: "/dashboard/connections", icon: Link2 },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];
