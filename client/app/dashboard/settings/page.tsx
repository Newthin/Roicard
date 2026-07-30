/**
 * Settings Page
 *
 * Route: /dashboard/settings
 * Allows users to manage profile, account, security, and account deletion.
 */

import { SettingsView } from "@/components/settings";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return <SettingsView />;
}
