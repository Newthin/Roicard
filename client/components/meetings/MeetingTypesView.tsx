"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { MeetingTypeForm } from "./MeetingTypeForm";
import { getMeetingTypes, createMeetingType, updateMeetingType, deleteMeetingType } from "@/lib/api/meetings";
import type { MeetingType } from "@/lib/api/meetings";
import { Calendar, Clock, MapPin, Phone, Link2, Pencil, Trash2, Plus, ToggleLeft, ToggleRight } from "lucide-react";

const FORMAT_ICONS: Record<string, React.ReactNode> = {
  google_meet: <Link2 className="h-4 w-4" />,
  zoom: <Link2 className="h-4 w-4" />,
  custom_link: <Link2 className="h-4 w-4" />,
  in_person: <MapPin className="h-4 w-4" />,
  phone: <Phone className="h-4 w-4" />,
};

export function MeetingTypesView() {
  const [types, setTypes] = useState<MeetingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MeetingType | null>(null);

  const load = async () => {
    try {
      const data = await getMeetingTypes();
      setTypes(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (data: Record<string, unknown>) => {
    if (editing) {
      await updateMeetingType(editing.id, data);
    } else {
      await createMeetingType(data);
    }
    await load();
  };

  const handleToggle = async (type: MeetingType) => {
    await updateMeetingType(type.id, { is_active: !type.is_active });
    await load();
  };

  const handleDelete = async (type: MeetingType) => {
    if (!confirm(`Delete "${type.name}"? This cannot be undone.`)) return;
    await deleteMeetingType(type.id);
    await load();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-roicard-text">Meeting Types</h2>
          <p className="text-sm text-roicard-text-muted">Create and manage your meeting types</p>
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Create
        </Button>
      </div>

      {types.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="mx-auto mb-3 h-10 w-10 text-roicard-text-muted" />
            <p className="text-roicard-text-muted">No meeting types yet. Create your first one to start receiving bookings.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {types.map((type) => (
            <Card key={type.id}>
              <CardContent className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-roicard-text">{type.name}</h3>
                    {!type.is_active && (
                      <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-400">Inactive</span>
                    )}
                  </div>
                  {type.description && <p className="mt-1 text-sm text-roicard-text-muted">{type.description}</p>}
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-roicard-text-muted">
                    <span className="flex items-center gap-1">{FORMAT_ICONS[type.format]}{type.format_label}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{type.duration_minutes} min</span>
                    {type.buffer_minutes > 0 && <span>Buffer: {type.buffer_minutes}m</span>}
                    <span>Notice: {type.min_notice_hours}h</span>
                    <span>Advance: {type.advance_booking_days}d</span>
                    {type.max_bookings_per_day && <span>Max/day: {type.max_bookings_per_day}</span>}
                  </div>
                  {type.availability.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {type.availability.map((a) => (
                        <span key={a.id} className="rounded bg-roicard-bg-muted px-2 py-0.5 text-[10px] text-roicard-text-muted">
                          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][a.day_of_week]} {a.start_time}-{a.end_time}
                        </span>
                      ))}
                    </div>
                  )}
                  {type.custom_questions.length > 0 && (
                    <div className="mt-2 text-xs text-roicard-text-muted">
                      {type.custom_questions.length} custom question{type.custom_questions.length !== 1 ? "s" : ""}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleToggle(type)} className="rounded p-1.5 text-roicard-text-muted hover:bg-roicard-bg-muted" title={type.is_active ? "Deactivate" : "Activate"}>
                    {type.is_active ? <ToggleRight className="h-5 w-5 text-emerald-400" /> : <ToggleLeft className="h-5 w-5 text-roicard-text-muted" />}
                  </button>
                  <button onClick={() => { setEditing(type); setFormOpen(true); }} className="rounded p-1.5 text-roicard-text-muted hover:bg-roicard-bg-muted" title="Edit">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(type)} className="rounded p-1.5 text-red-400 hover:bg-red-500/10" title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <MeetingTypeForm key={editing?.id ?? 'new'} isOpen={formOpen} onClose={() => setFormOpen(false)} meetingType={editing} onSave={handleSave} />
    </div>
  );
}
