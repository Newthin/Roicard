"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { getBookings } from "@/lib/api/meetings";
import type { MeetingBooking } from "@/lib/api/meetings";
import { History, Clock, User } from "lucide-react";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-emerald-500/20 text-emerald-400",
  cancelled: "bg-red-500/20 text-red-400",
  declined: "bg-red-500/20 text-red-400",
  expired: "bg-roicard-bg-muted text-roicard-text-muted",
};

export function PastMeetingsView() {
  const [bookings, setBookings] = useState<MeetingBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await getBookings();
        const now = new Date().toISOString();
        setBookings(
          res.data.filter((b: MeetingBooking) => b.end_time < now || ["completed", "cancelled", "declined", "expired"].includes(b.status))
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-40 w-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-roicard-text">Past Meetings</h2>
        <p className="text-sm text-roicard-text-muted">Completed, cancelled, and expired meetings</p>
      </div>

      {bookings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <History className="mx-auto mb-3 h-10 w-10 text-roicard-text-muted" />
            <p className="text-roicard-text-muted">No past meetings</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <Card key={b.id}>
              <CardContent className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-roicard-text">{b.type_name}</h3>
                  <p className="flex items-center gap-1 text-sm text-roicard-text-muted">
                    <Clock className="h-3 w-3" /> {formatDateTime(b.start_time)}
                  </p>
                  <p className="flex items-center gap-1 text-sm text-roicard-text-muted">
                    <User className="h-3 w-3" /> {b.guest_name}
                  </p>
                </div>
                <span className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_COLORS[b.status] ?? "bg-roicard-bg-muted text-roicard-text-muted"}`}>
                  {b.status.replace("_", " ")}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
