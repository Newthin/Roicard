"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { getBookings, cancelBooking } from "@/lib/api/meetings";
import type { MeetingBooking } from "@/lib/api/meetings";
import { Calendar, Clock, MapPin, Link2, User, XCircle } from "lucide-react";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400",
  confirmed: "bg-emerald-500/20 text-emerald-400",
  reschedule_requested: "bg-blue-500/20 text-blue-400",
  cancelled: "bg-red-500/20 text-red-400",
  declined: "bg-red-500/20 text-red-400",
  completed: "bg-roicard-bg-muted text-roicard-text-muted",
  expired: "bg-roicard-bg-muted text-roicard-text-muted",
};

export function UpcomingMeetingsView() {
  const [bookings, setBookings] = useState<MeetingBooking[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await getBookings({ upcoming: true });
      setBookings(res.data.filter((b: MeetingBooking) => ["pending", "confirmed", "reschedule_requested"].includes(b.status)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCancel = async (id: number) => {
    if (!confirm("Cancel this meeting?")) return;
    await cancelBooking(id, "Cancelled by host");
    await load();
  };

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-40 w-full" /><Skeleton className="h-40 w-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-roicard-text">Upcoming Meetings</h2>
        <p className="text-sm text-roicard-text-muted">Your scheduled and pending meetings</p>
      </div>

      {bookings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="mx-auto mb-3 h-10 w-10 text-roicard-text-muted" />
            <p className="text-roicard-text-muted">No upcoming meetings</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <Card key={b.id}>
              <CardContent className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-roicard-text">{b.type_name}</h3>
                    <p className="flex items-center gap-1 text-sm text-roicard-text-muted">
                      <Clock className="h-3 w-3" /> {formatDateTime(b.start_time)}
                    </p>
                  </div>
                  <span className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_COLORS[b.status] ?? "bg-roicard-bg-muted text-roicard-text-muted"}`}>
                    {b.status.replace("_", " ")}
                  </span>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-roicard-text-muted">
                  <span className="flex items-center gap-1"><User className="h-3 w-3" />{b.guest_name}</span>
                  <span>{b.type_format}</span>
                  {b.type_location_detail && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{b.type_location_detail}</span>}
                </div>
                {["pending", "confirmed"].includes(b.status) && (
                  <div className="border-t border-roicard-border pt-3">
                    <button onClick={() => handleCancel(b.id)} className="flex items-center gap-1 text-sm text-red-400 hover:text-red-300">
                      <XCircle className="h-3 w-3" /> Cancel Meeting
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
