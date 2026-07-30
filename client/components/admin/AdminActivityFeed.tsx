/**
 * AdminActivityFeed
 *
 * Recent system activity list for the admin overview page.
 */

"use client";

import { getAdminActivityLog } from "@/lib/api/admin";
import type { AdminActivityLogEntry } from "@/lib/api/admin";
import { UserPlus, Nfc, UserX, Link2, Edit, Truck, PackageCheck } from "lucide-react";
import { useEffect, useState } from "react";

const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  update_user: Edit,
  assign_card: Nfc,
  unassign_card: Nfc,
  dispatch_card: Truck,
  deliver_card: PackageCheck,
};

const ACTION_LABELS: Record<string, string> = {
  update_user: "User profile updated",
  assign_card: "NFC card assigned",
  unassign_card: "NFC card unassigned",
  dispatch_card: "Smart card dispatched",
  deliver_card: "Smart card delivered",
};

function formatEntry(e: AdminActivityLogEntry) {
  const adminName = e.admin ? `${e.admin.first_name} ${e.admin.last_name}` : "Admin";
  const targetName = e.target_user ? `${e.target_user.first_name} ${e.target_user.last_name}` : null;
  const label = ACTION_LABELS[e.action] ?? `Action: ${e.action}`;
  const desc = targetName ? `${label} — ${targetName}` : label;
  const Icon = ACTION_ICONS[e.action] ?? Edit;
  return { id: e.id, icon: Icon, description: `${adminName}: ${desc}`, timestamp: e.created_at };
}

export function AdminActivityFeed() {
  const [entries, setEntries] = useState<ReturnType<typeof formatEntry>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminActivityLog()
      .then((logs) => setEntries(logs.map(formatEntry)))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl border border-roicard-border bg-roicard-bg-elevated">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-roicard-border border-t-roicard-primary" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-roicard-border bg-roicard-bg-elevated">
      <div className="border-b border-roicard-border px-4 py-3">
        <h2 className="text-sm font-semibold text-roicard-text">Recent Activity</h2>
      </div>
      {entries.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-roicard-text-muted">No activity yet.</p>
      ) : (
        <ul className="divide-y divide-roicard-border/60">
          {entries.map((event) => {
            const Icon = event.icon;
            return (
              <li key={event.id} className="flex items-start gap-3 px-4 py-3">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-roicard-accent" />
                <div>
                  <p className="text-sm text-roicard-text">{event.description}</p>
                  <p className="text-xs text-roicard-text-muted">
                    {new Date(event.timestamp).toLocaleString()}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
