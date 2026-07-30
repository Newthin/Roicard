/**
 * NFC Management View
 *
 * Admin page for NFC card assignments.
 * Route: /admin/nfc
 */

"use client";

import { NFCTable } from "@/components/admin/NFCTable";

export function NFCManagementView() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-roicard-text">Roicard Management</h1>
        <p className="mt-1 text-sm text-roicard-text-muted">
          Register new cards, assign, reassign, and remove Roicard assignments
        </p>
      </div>

      <NFCTable />
    </div>
  );
}
