"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { MeetingTypesView } from "@/components/meetings/MeetingTypesView";
import { BlockedDatesView } from "@/components/meetings/BlockedDatesView";
import { PendingRequestsView } from "@/components/meetings/PendingRequestsView";
import { UpcomingMeetingsView } from "@/components/meetings/UpcomingMeetingsView";
import { PastMeetingsView } from "@/components/meetings/PastMeetingsView";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar, Clock, History, CalendarX, Settings } from "lucide-react";

const TABS = [
  { id: "upcoming", label: "Upcoming", icon: Calendar },
  { id: "pending", label: "Pending", icon: Clock },
  { id: "past", label: "Past", icon: History },
  { id: "types", label: "Meeting Types", icon: Settings },
  { id: "blocked", label: "Blocked Dates", icon: CalendarX },
] as const;

type TabId = (typeof TABS)[number]["id"];

const BOOKING_TABS: readonly TabId[] = ["upcoming", "pending", "past"];

export default function MeetingsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabId>("upcoming");

  const canManageMeetings =
    user?.meetings_access === true ||
    user?.subscription?.features?.meetings === true;

  // A downgraded member keeps read/cancel access to bookings made while paid,
  // but loses the tabs that create or manage meeting availability.
  const visibleTabs = canManageMeetings
    ? TABS
    : TABS.filter((t) => (BOOKING_TABS as readonly string[]).includes(t.id));
  const activeTab: TabId = canManageMeetings || (BOOKING_TABS as readonly string[]).includes(tab)
    ? tab
    : "upcoming";

  return (
    <div className="space-y-6">
      <div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-roicard-primary/15 px-3 py-1 text-xs font-medium text-roicard-accent">
          Meetings
        </span>
        <h1 className="mt-3 text-2xl font-bold text-roicard-text sm:text-3xl">
          Meeting Management
        </h1>
        <p className="mt-2 text-sm text-roicard-text-muted sm:text-base">
          Manage your availability, meeting types, and booking requests.
        </p>
      </div>

      {!canManageMeetings && (
        <div className="rounded-lg border border-roicard-primary/30 bg-roicard-primary/10 p-4">
          <h2 className="text-sm font-semibold text-roicard-text">
            Meeting booking is a paid feature
          </h2>
          <p className="mt-1 text-sm text-roicard-text-muted">
            Upgrade to create meeting types, set your availability and accept
            new bookings. Any bookings from a previous membership are still
            shown below and can be cancelled.
          </p>
          <Link
            href="/pricing"
            className="mt-3 inline-flex items-center rounded-md bg-roicard-primary px-4 py-2 text-sm font-medium text-roicard-on-primary hover:opacity-90"
          >
            Compare plans
          </Link>
        </div>
      )}

      <div className="flex flex-wrap gap-1 rounded-lg border border-roicard-border bg-roicard-bg-elevated p-1">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              activeTab === t.id
                ? "bg-roicard-primary text-roicard-on-primary"
                : "text-roicard-text-muted hover:text-roicard-text"
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === "upcoming" && <UpcomingMeetingsView />}
        {activeTab === "pending" && <PendingRequestsView />}
        {activeTab === "past" && <PastMeetingsView />}
        {canManageMeetings && activeTab === "types" && <MeetingTypesView />}
        {canManageMeetings && activeTab === "blocked" && <BlockedDatesView />}
      </div>
    </div>
  );
}
