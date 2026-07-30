/**
 * Admin Users Page
 *
 * Route: /admin/users
 * Displays all platform users and allows management actions.
 */

import { UsersManagementView } from "@/components/admin";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Users — Admin",
};

export default function AdminUsersPage() {
  return <UsersManagementView />;
}
