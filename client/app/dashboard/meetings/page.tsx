"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { MeetingTypesView } from "@/components/meetings/MeetingTypesView";
import { AvailabilityEditor } from "@/components/meetings/AvailabilityEditor";
import { BlockedDatesView } from "@/components/meetings/BlockedDatesView";
import { PendingRequestsView } from "@/components/meetings/PendingRequestsView";
import { UpcomingMeetingsView } from "@/components/meetings/UpcomingMeetingsView";
import { PastMeetingsView } from "@/components/meetings/PastMeetingsView";
import { Calendar, Clock, Users, History, CalendarX, Settings } from "lucide-react";

const TABS = [
  { id: "upcoming", label: "Upcoming", icon: Calendar },
  { id: "pending", label: "Pending", icon: Clock },
  { id: "past", label: "Past", icon: History },
  { id: "types", label: "Meeting Types", icon: Settings },
  { id: "blocked", label: "Blocked Dates", icon: CalendarX },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function MeetingsPage() {
  const [tab, setTab] = useState<TabId>("upcoming");

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

      <div className="flex flex-wrap gap-1 rounded-lg border border-roicard-border bg-roicard-bg-elevated p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              tab === t.id
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
        {tab === "upcoming" && <UpcomingMeetingsView />}
        {tab === "pending" && <PendingRequestsView />}
        {tab === "past" && <PastMeetingsView />}
        {tab === "types" && <MeetingTypesView />}
        {tab === "blocked" && <BlockedDatesView />}
      </div>
    </div>
  );
}
