"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { getBookings, confirmBooking, declineBooking, proposeReschedule } from "@/lib/api/meetings";
import type { MeetingBooking } from "@/lib/api/meetings";
import { Clock, User, Mail, MessageSquare, Check, X, CalendarClock } from "lucide-react";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function PendingRequestsView() {
  const [bookings, setBookings] = useState<MeetingBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [rescheduleId, setRescheduleId] = useState<number | null>(null);
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");

  const load = async () => {
    try {
      const res = await getBookings({ status: "pending" });
      setBookings(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAccept = async (id: number) => {
    setActionLoading(id);
    try {
      await confirmBooking(id);
      await load();
    } catch {
      alert("Failed to confirm — the slot may no longer be available.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (id: number) => {
    if (!confirm("Decline this booking request?")) return;
    setActionLoading(id);
    try {
      await declineBooking(id, "Declined by host");
      await load();
    } finally {
      setActionLoading(null);
    }
  };

  const handleReschedule = async (id: number) => {
    if (!rescheduleTime) return;
    setActionLoading(id);
    try {
      await proposeReschedule(id, rescheduleTime, rescheduleReason || undefined);
      setRescheduleId(null); setRescheduleTime(""); setRescheduleReason("");
      await load();
    } catch {
      alert("Proposed time is not available.");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-40 w-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-roicard-text">Pending Requests</h2>
        <p className="text-sm text-roicard-text-muted">Booking requests awaiting your response</p>
      </div>

      {bookings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="mx-auto mb-3 h-10 w-10 text-roicard-text-muted" />
            <p className="text-roicard-text-muted">No pending requests</p>
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
                    <p className="text-sm text-roicard-text-muted">{formatDateTime(b.start_time)} — {formatDateTime(b.end_time)}</p>
                  </div>
                  <span className="rounded bg-yellow-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-yellow-400">Pending</span>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-roicard-text-muted">
                  <span className="flex items-center gap-1"><User className="h-3 w-3" />{b.guest_name}</span>
                  <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{b.guest_email}</span>
                  <span>Format: {b.type_format}</span>
                </div>
                {b.guest_notes && (
                  <div className="flex items-start gap-1 text-sm text-roicard-text-muted">
                    <MessageSquare className="mt-0.5 h-3 w-3 shrink-0" />
                    <p>{b.guest_notes}</p>
                  </div>
                )}
                {b.custom_answers && b.custom_answers.length > 0 && (
                  <div className="space-y-1">
                    {b.custom_answers.map((a) => (
                      <div key={a.id} className="text-xs text-roicard-text-muted">
                        <span className="font-medium">{a.question}:</span> {a.answer}
                      </div>
                    ))}
                  </div>
                )}

                {rescheduleId === b.id ? (
                  <div className="flex flex-wrap items-end gap-2 border-t border-roicard-border pt-3">
                    <div>
                      <label className="mb-1 block text-xs text-roicard-text-muted">New Date & Time</label>
                      <input type="datetime-local" value={rescheduleTime} onChange={(e) => setRescheduleTime(e.target.value)} className="rounded-lg border border-roicard-border bg-roicard-bg-muted px-3 py-2 text-sm text-roicard-text" />
                    </div>
                    <input type="text" value={rescheduleReason} onChange={(e) => setRescheduleReason(e.target.value)} placeholder="Reason (optional)" className="rounded-lg border border-roicard-border bg-roicard-bg-muted px-3 py-2 text-sm text-roicard-text" />
                    <Button size="sm" onClick={() => handleReschedule(b.id)} isLoading={actionLoading === b.id}>Send</Button>
                    <Button size="sm" variant="secondary" onClick={() => setRescheduleId(null)}>Cancel</Button>
                  </div>
                ) : (
                  <div className="flex gap-2 border-t border-roicard-border pt-3">
                    <Button size="sm" onClick={() => handleAccept(b.id)} isLoading={actionLoading === b.id}>
                      <Check className="mr-1 h-3 w-3" /> Accept
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => handleDecline(b.id)} isLoading={actionLoading === b.id}>
                      <X className="mr-1 h-3 w-3" /> Decline
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setRescheduleId(b.id)}>
                      <CalendarClock className="mr-1 h-3 w-3" /> Suggest New Time
                    </Button>
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
