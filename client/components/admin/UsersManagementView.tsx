/**
 * Users Management View
 *
 * Admin page for managing platform users.
 * Route: /admin/users
 */

"use client";

import { UserTable } from "@/components/admin/UserTable";

export function UsersManagementView() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-roicard-text">User Management</h1>
        <p className="mt-1 text-sm text-roicard-text-muted">
          View, edit, and manage all platform users
        </p>
      </div>

      <UserTable />
    </div>
  );
}
