"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { AvailabilityEditor } from "./AvailabilityEditor";
import type { MeetingType, MeetingTypeAvailability, MeetingTypeCustomQuestion } from "@/lib/api/meetings";

const FORMATS = [
  { value: "google_meet", label: "Google Meet" },
  { value: "zoom", label: "Zoom" },
  { value: "custom_link", label: "Custom Virtual Link" },
  { value: "in_person", label: "In-Person" },
  { value: "phone", label: "Phone" },
];

const DURATIONS = [15, 30, 45, 60];
const BUFFERS = [0, 10, 15, 30];
const MIN_NOTICE = [1, 2, 3, 6, 12, 24, 48];
const ADVANCE_DAYS = [7, 14, 30, 60, 90];

type Props = {
  isOpen: boolean;
  onClose: () => void;
  meetingType?: MeetingType | null;
  onSave: (data: Record<string, unknown>) => Promise<void>;
};

export function MeetingTypeForm({ isOpen, onClose, meetingType, onSave }: Props) {
  const [name, setName] = useState(meetingType?.name ?? "");
  const [description, setDescription] = useState(meetingType?.description ?? "");
  const [duration, setDuration] = useState(meetingType?.duration_minutes ?? 30);
  const [format, setFormat] = useState(meetingType?.format ?? "google_meet");
  const [locationDetail, setLocationDetail] = useState(meetingType?.location_detail ?? "");
  const [phoneNumber, setPhoneNumber] = useState(meetingType?.phone_number ?? "");
  const [meetingLink, setMeetingLink] = useState(meetingType?.meeting_link ?? "");
  const [buffer, setBuffer] = useState(meetingType?.buffer_minutes ?? 0);
  const [minNotice, setMinNotice] = useState(meetingType?.min_notice_hours ?? 2);
  const [advanceDays, setAdvanceDays] = useState(meetingType?.advance_booking_days ?? 30);
  const [maxPerDay, setMaxPerDay] = useState(meetingType?.max_bookings_per_day?.toString() ?? "");
  const [availability, setAvailability] = useState<Partial<MeetingTypeAvailability>[]>(
    meetingType?.availability ?? []
  );
  const [customQuestions, setCustomQuestions] = useState<{ question: string; is_required: boolean }[]>(
    meetingType?.custom_questions?.map((q) => ({ question: q.question, is_required: q.is_required })) ?? []
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const updateQuestion = (index: number, field: "question" | "is_required", val: string | boolean) => {
    setCustomQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, [field]: val } : q)));
  };

  const addQuestion = () => {
    if (customQuestions.length >= 3) return;
    setCustomQuestions((prev) => [...prev, { question: "", is_required: false }]);
  };

  const removeQuestion = (index: number) => {
    setCustomQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError("");
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || null,
        duration_minutes: duration,
        format,
        location_detail: locationDetail.trim() || null,
        phone_number: phoneNumber.trim() || null,
        meeting_link: meetingLink.trim() || null,
        buffer_minutes: buffer,
        min_notice_hours: minNotice,
        advance_booking_days: advanceDays,
        max_bookings_per_day: maxPerDay ? Number(maxPerDay) : null,
        availability,
        custom_questions: customQuestions.filter((q) => q.question.trim()),
      });
      onClose();
    } catch (e: unknown) {
      const axiosErr = e as {
        response?: { data?: { message?: string; errors?: Record<string, string[]> } };
      };
      const fieldErrors = axiosErr?.response?.data?.errors;
      const firstFieldError = fieldErrors
        ? Object.values(fieldErrors).flat()[0]
        : undefined;
      setError(
        firstFieldError ??
          axiosErr?.response?.data?.message ??
          (e instanceof Error ? e.message : "Failed to save")
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={meetingType ? "Edit Meeting Type" : "Create Meeting Type"}
      description="Configure your meeting type settings"
      className="max-w-2xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} isLoading={saving}>Save</Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <p className="text-sm text-red-400">{error}</p>}

        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 30-min Consultation" />
        <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of this meeting type" />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-roicard-text">Duration</label>
            <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full rounded-lg border border-roicard-border bg-roicard-bg-muted px-3 py-2 text-sm text-roicard-text">
              {DURATIONS.map((d) => <option key={d} value={d}>{d} min</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-roicard-text">Format</label>
            <select value={format} onChange={(e) => setFormat(e.target.value)} className="w-full rounded-lg border border-roicard-border bg-roicard-bg-muted px-3 py-2 text-sm text-roicard-text">
              {FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
        </div>

        {format === "in_person" && (
          <Input label="Location" value={locationDetail} onChange={(e) => setLocationDetail(e.target.value)} placeholder="e.g. 123 Main St, Suite 100" />
        )}
        {format === "phone" && (
          <Input label="Phone Number" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+1 555 123 4567" />
        )}
        {(format === "google_meet" || format === "zoom" || format === "custom_link") && (
          <Input label="Meeting Link" value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} placeholder="https://..." />
        )}

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-roicard-text">Buffer (min)</label>
            <select value={buffer} onChange={(e) => setBuffer(Number(e.target.value))} className="w-full rounded-lg border border-roicard-border bg-roicard-bg-muted px-3 py-2 text-sm text-roicard-text">
              {BUFFERS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-roicard-text">Min Notice (hrs)</label>
            <select value={minNotice} onChange={(e) => setMinNotice(Number(e.target.value))} className="w-full rounded-lg border border-roicard-border bg-roicard-bg-muted px-3 py-2 text-sm text-roicard-text">
              {MIN_NOTICE.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-roicard-text">Advance (days)</label>
            <select value={advanceDays} onChange={(e) => setAdvanceDays(Number(e.target.value))} className="w-full rounded-lg border border-roicard-border bg-roicard-bg-muted px-3 py-2 text-sm text-roicard-text">
              {ADVANCE_DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        <Input label="Max Bookings/Day" value={maxPerDay} onChange={(e) => setMaxPerDay(e.target.value)} placeholder="Unlimited" hint="Leave empty for unlimited" />

        <div>
          <label className="mb-2 block text-sm font-medium text-roicard-text">Weekly Availability</label>
          <AvailabilityEditor value={availability as MeetingTypeAvailability[]} onChange={setAvailability} />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-roicard-text">Custom Questions</label>
            <button type="button" onClick={addQuestion} disabled={customQuestions.length >= 3} className="text-xs font-medium text-roicard-accent hover:text-roicard-accent/80 disabled:opacity-50">
              + Add ({customQuestions.length}/3)
            </button>
          </div>
          {customQuestions.map((q, i) => (
            <div key={i} className="mb-2 flex items-center gap-2">
              <input
                type="text"
                value={q.question}
                onChange={(e) => updateQuestion(i, "question", e.target.value)}
                placeholder="Question text"
                className="flex-1 rounded-lg border border-roicard-border bg-roicard-bg-muted px-3 py-2 text-sm text-roicard-text"
              />
              <label className="flex items-center gap-1 text-xs text-roicard-text-muted">
                <input type="checkbox" checked={q.is_required} onChange={(e) => updateQuestion(i, "is_required", e.target.checked)} className="rounded" />
                Required
              </label>
              <button type="button" onClick={() => removeQuestion(i)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
