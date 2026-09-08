"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { getBlockedDates, createBlockedDate, deleteBlockedDate } from "@/lib/api/meetings";
import type { BlockedDate } from "@/lib/api/meetings";
import { CalendarX, Plus, Trash2 } from "lucide-react";

export function BlockedDatesView() {
  const [dates, setDates] = useState<BlockedDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const data = await getBlockedDates();
      setDates(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!startDate) return;
    setSaving(true);
    try {
      await createBlockedDate({
        start_date: startDate,
        end_date: endDate || undefined,
        reason: reason.trim() || undefined,
      });
      setStartDate(""); setEndDate(""); setReason(""); setShowForm(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    await deleteBlockedDate(id);
    await load();
  };

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-32 w-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-roicard-text">Blocked Dates</h2>
          <p className="text-sm text-roicard-text-muted">Dates when you are unavailable for meetings</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} variant="secondary">
          <Plus className="mr-2 h-4 w-4" /> Block Date
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-roicard-text">Start Date</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded-lg border border-roicard-border bg-roicard-bg-muted px-3 py-2 text-sm text-roicard-text" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-roicard-text">End Date (optional)</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full rounded-lg border border-roicard-border bg-roicard-bg-muted px-3 py-2 text-sm text-roicard-text" />
              </div>
            </div>
            <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional)" className="w-full rounded-lg border border-roicard-border bg-roicard-bg-muted px-3 py-2 text-sm text-roicard-text" />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowForm(false)} size="sm">Cancel</Button>
              <Button onClick={handleAdd} isLoading={saving} size="sm">Save</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {dates.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <CalendarX className="mx-auto mb-2 h-8 w-8 text-roicard-text-muted" />
            <p className="text-sm text-roicard-text-muted">No blocked dates</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {dates.map((d) => (
            <Card key={d.id}>
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-roicard-text">
                    {d.start_date}{d.end_date ? ` — ${d.end_date}` : ""}
                  </p>
                  {d.reason && <p className="text-xs text-roicard-text-muted">{d.reason}</p>}
                </div>
                <button onClick={() => handleDelete(d.id)} className="rounded p-1.5 text-red-400 hover:bg-red-500/10">
                  <Trash2 className="h-4 w-4" />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
