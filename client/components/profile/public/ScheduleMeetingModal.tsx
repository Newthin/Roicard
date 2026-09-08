"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { PublicProfileMeetingType } from "@/lib/api/profile";
import {
  getPublicSlots,
  submitPublicBooking,
  type TimeSlot,
} from "@/lib/api/publicBooking";
import { cn } from "@/lib/cn";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  Clock,
  Loader2,
  Video,
  MapPin,
  Phone,
  Link as LinkIcon,
  User,
  Mail,
  AlertCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ─── Types ──────────────────────────────────────────────────────────────

type ScheduleMeetingModalProps = {
  isOpen: boolean;
  onClose: () => void;
  slug: string;
  memberName: string;
  meetingTypes: PublicProfileMeetingType[];
};

type Step = "type" | "date" | "time" | "info" | "questions" | "review" | "success" | "error";

type FormData = {
  meetingType: PublicMeetingType | null;
  date: string;
  timeSlot: TimeSlot | null;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestNotes: string;
  customAnswers: Record<number, string>;
  format: string;
};

type BookingResult = {
  id: number;
  status: string;
  start_time: string;
  end_time: string;
  guest_name: string;
  guest_email: string;
  cancellation_url: string;
};

// ─── Helpers ────────────────────────────────────────────────────────────

function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function getFormatIcon(format: string) {
  switch (format) {
    case "google_meet":
    case "zoom":
    case "custom_link":
      return <Video className="h-4 w-4" />;
    case "in_person":
      return <MapPin className="h-4 w-4" />;
    case "phone":
      return <Phone className="h-4 w-4" />;
    default:
      return <LinkIcon className="h-4 w-4" />;
  }
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function toDateString(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// ─── Component ──────────────────────────────────────────────────────────

type PublicMeetingType = PublicProfileMeetingType;

export function ScheduleMeetingModal({
  isOpen,
  onClose,
  slug,
  memberName,
  meetingTypes,
}: ScheduleMeetingModalProps) {
  const [step, setStep] = useState<Step>("type");
  const [form, setForm] = useState<FormData>({
    meetingType: null,
    date: "",
    timeSlot: null,
    guestName: "",
    guestEmail: "",
    guestPhone: "",
    guestNotes: "",
    customAnswers: {},
    format: "",
  });
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  const tz = useMemo(() => getUserTimezone(), []);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setStep("type");
      setForm({
        meetingType: null,
        date: "",
        timeSlot: null,
        guestName: "",
        guestEmail: "",
        guestPhone: "",
        guestNotes: "",
        customAnswers: {},
        format: "",
      });
      setSlots([]);
      setSlotsError(null);
      setSubmitError(null);
      setBookingResult(null);
      setCalMonth(() => {
        const now = new Date();
        return { year: now.getFullYear(), month: now.getMonth() };
      });
    }
  }, [isOpen]);

  // Auto-select if only one meeting type
  useEffect(() => {
    if (isOpen && meetingTypes.length === 1 && !form.meetingType) {
      const t = meetingTypes[0];
      setForm((f) => ({ ...f, meetingType: t, format: t.format }));
      setStep("date");
    }
  }, [isOpen, meetingTypes, form.meetingType]);

  // Fetch slots when date is selected
  useEffect(() => {
    if (step !== "time" || !form.meetingType || !form.date) return;

    const controller = new AbortController();
    setSlotsLoading(true);
    setSlotsError(null);

    const from = form.date;
    // Fetch one day of slots
    const toDate = new Date(form.date + "T00:00:00");
    toDate.setDate(toDate.getDate() + 1);
    const to = toDateString(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());

    getPublicSlots(slug, form.meetingType.id, from, to)
      .then((data) => {
        if (!controller.signal.aborted) {
          setSlots(data);
          if (data.length === 0) {
            setSlotsError("No available times for this date. Please select another date.");
          }
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          if (err?.response?.status === 409) {
            setSlotsError("This slot is no longer available.");
          } else {
            setSlotsError("Could not load available times. Please try again.");
          }
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setSlotsLoading(false);
      });

    return () => controller.abort();
  }, [step, form.meetingType, form.date, slug]);

  const hasRequiredQuestions = useMemo(() => {
    if (!form.meetingType) return false;
    return form.meetingType.custom_questions.some((q) => q.is_required);
  }, [form.meetingType]);

  const allRequiredAnswered = useMemo(() => {
    if (!form.meetingType) return false;
    return form.meetingType.custom_questions
      .filter((q) => q.is_required)
      .every((q) => (form.customAnswers[q.id] ?? "").trim().length > 0);
  }, [form.meetingType, form.customAnswers]);

  const isInfoValid = form.guestName.trim().length > 0 && form.guestEmail.trim().length > 0;

  // ─── Navigation ─────────────────────────────────────────────────────

  const goNext = useCallback(() => {
    setSubmitError(null);
    setSlotsError(null);
    switch (step) {
      case "type":
        setStep("date");
        break;
      case "date":
        setStep("time");
        break;
      case "time":
        setStep("info");
        break;
      case "info":
        if (hasRequiredQuestions) {
          setStep("questions");
        } else {
          setStep("review");
        }
        break;
      case "questions":
        setStep("review");
        break;
      case "review":
        handleSubmit();
        break;
    }
  }, [step, hasRequiredQuestions]);

  const goBack = useCallback(() => {
    setSubmitError(null);
    setSlotsError(null);
    switch (step) {
      case "date":
        setStep(meetingTypes.length > 1 ? "type" : "date");
        break;
      case "time":
        setStep("date");
        break;
      case "info":
        setStep("time");
        break;
      case "questions":
        setStep("info");
        break;
      case "review":
        setStep(hasRequiredQuestions ? "questions" : "info");
        break;
    }
  }, [step, meetingTypes.length, hasRequiredQuestions]);

  // ─── Submit ─────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (!form.meetingType || !form.timeSlot) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const customAnswers = form.meetingType.custom_questions.map((q) => ({
        question_id: q.id,
        answer: form.customAnswers[q.id] ?? "",
      }));

      const result = await submitPublicBooking(slug, form.meetingType.id, {
        guest_name: form.guestName.trim(),
        guest_email: form.guestEmail.trim(),
        guest_phone: form.guestPhone.trim() || undefined,
        guest_notes: form.guestNotes.trim() || undefined,
        start_time: form.timeSlot.start,
        timezone: tz,
        format: form.format !== form.meetingType.format ? form.format : undefined,
        custom_answers: customAnswers.length > 0 ? customAnswers : undefined,
      });

      setBookingResult(result);
      setStep("success");
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { message?: string; error?: string } } };
      const status = axiosErr?.response?.status;
      const msg = axiosErr?.response?.data?.message || axiosErr?.response?.data?.error;

      if (status === 409) {
        setSubmitError("This time slot was just taken by someone else. Please go back and select a different time.");
        setStep("time");
        // Re-fetch slots
        if (form.meetingType && form.date) {
          setSlotsLoading(true);
          const toDate = new Date(form.date + "T00:00:00");
          toDate.setDate(toDate.getDate() + 1);
          const to = toDateString(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
          try {
            const refreshed = await getPublicSlots(slug, form.meetingType.id, form.date, to);
            setSlots(refreshed);
          } catch {
            // ignore
          } finally {
            setSlotsLoading(false);
          }
        }
      } else if (status === 422 && msg) {
        setSubmitError(msg);
      } else if (status === 404) {
        setSubmitError("This meeting type is no longer available.");
      } else {
        setSubmitError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }, [form, slug, tz]);

  // ─── Calendar ───────────────────────────────────────────────────────

  const calendarDays = useMemo(() => {
    const { year, month } = calMonth;
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = getDaysInMonth(year, month);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: { day: number; dateStr: string; disabled: boolean }[] = [];

    // Fill leading empty slots
    for (let i = 0; i < firstDay; i++) {
      days.push({ day: 0, dateStr: "", disabled: true });
    }

    for (let d = 1; d <= totalDays; d++) {
      const dateStr = toDateString(year, month, d);
      const dateObj = new Date(year, month, d);
      dateObj.setHours(0, 0, 0, 0);
      // Disable past dates and today
      const disabled = dateObj <= today;
      days.push({ day: d, dateStr, disabled });
    }

    return days;
  }, [calMonth]);

  const calMonthLabel = useMemo(() => {
    const d = new Date(calMonth.year, calMonth.month, 1);
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }, [calMonth]);

  const canPrevMonth = useMemo(() => {
    const now = new Date();
    return calMonth.year > now.getFullYear() || (calMonth.year === now.getFullYear() && calMonth.month > now.getMonth());
  }, [calMonth]);

  const nextMonth = useCallback(() => {
    setCalMonth((m) => {
      if (m.month === 11) return { year: m.year + 1, month: 0 };
      return { year: m.year, month: m.month + 1 };
    });
  }, []);

  const prevMonth = useCallback(() => {
    setCalMonth((m) => {
      if (m.month === 0) return { year: m.year - 1, month: 11 };
      return { year: m.year, month: m.month - 1 };
    });
  }, []);

  // ─── Step indicators ────────────────────────────────────────────────

  const stepLabels = useMemo(() => {
    const labels: { key: Step; label: string }[] = [{ key: "type", label: "Type" }];
    if (meetingTypes.length <= 1) labels.pop(); // skip type step label if auto-selected
    labels.push({ key: "date", label: "Date" });
    labels.push({ key: "time", label: "Time" });
    labels.push({ key: "info", label: "Info" });
    if (hasRequiredQuestions) labels.push({ key: "questions", label: "Questions" });
    labels.push({ key: "review", label: "Confirm" });
    return labels;
  }, [meetingTypes.length, hasRequiredQuestions]);

  const currentStepIdx = stepLabels.findIndex((s) => s.key === step);
  const progress = step === "success" || step === "error" ? 100 : stepLabels.length > 0 ? ((currentStepIdx + 1) / stepLabels.length) * 100 : 0;

  const canGoNext = useMemo(() => {
    switch (step) {
      case "type":
        return form.meetingType !== null;
      case "date":
        return form.date !== "";
      case "time":
        return form.timeSlot !== null;
      case "info":
        return isInfoValid;
      case "questions":
        return allRequiredAnswered;
      case "review":
        return true;
      default:
        return false;
    }
  }, [step, form.meetingType, form.date, form.timeSlot, isInfoValid, allRequiredAnswered]);

  const nextLabel = step === "review" ? "Submit Booking" : "Continue";

  // ─── Scroll to top on step change ───────────────────────────────────

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-h-[90dvh] sm:max-h-[85dvh]"
    >
      <div className="flex flex-col">
        {/* Progress bar */}
        {step !== "success" && step !== "error" && (
          <div className="mb-4">
            <div className="h-1 w-full overflow-hidden rounded-full bg-roicard-border">
              <div
                className="h-full rounded-full bg-roicard-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-2 flex justify-center gap-1.5">
              {stepLabels.map((s, i) => (
                <span
                  key={s.key}
                  className={cn(
                    "text-[10px] font-medium uppercase tracking-wide",
                    i <= currentStepIdx ? "text-roicard-primary" : "text-roicard-text-muted"
                  )}
                >
                  {s.label}
                  {i < stepLabels.length - 1 && <span className="ml-1.5 text-roicard-border">/</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Scrollable content */}
        <div ref={scrollRef} className="max-h-[60dvh] overflow-y-auto pr-1 -mr-1">
          {/* ─── Step: Select Type ──────────────────────────────────── */}
          {step === "type" && (
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-roicard-text">Choose a meeting type</h3>
              <div className="space-y-2">
                {meetingTypes.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setForm((f) => ({ ...f, meetingType: t, format: t.format }))}
                    className={cn(
                      "w-full rounded-xl border p-4 text-left transition-all",
                      form.meetingType?.id === t.id
                        ? "border-roicard-primary bg-roicard-primary/5"
                        : "border-roicard-border hover:border-roicard-accent/50 hover:bg-roicard-bg-muted"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {getFormatIcon(t.format)}
                          <span className="font-medium text-roicard-text">{t.name}</span>
                        </div>
                        {t.description && (
                          <p className="mt-1 text-sm text-roicard-text-muted line-clamp-2">{t.description}</p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-roicard-text-muted">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(t.duration_minutes)}
                          </span>
                          <span>{t.format_label}</span>
                        </div>
                      </div>
                      {form.meetingType?.id === t.id && (
                        <Check className="mt-0.5 h-5 w-5 shrink-0 text-roicard-primary" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ─── Step: Select Date ─────────────────────────────────── */}
          {step === "date" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold text-roicard-text">Pick a date</h3>
                <p className="mt-0.5 text-sm text-roicard-text-muted">
                  {form.meetingType?.name} &middot; {formatDuration(form.meetingType?.duration_minutes ?? 0)}
                </p>
              </div>

              {/* Calendar */}
              <div className="rounded-xl border border-roicard-border p-3">
                <div className="mb-3 flex items-center justify-between">
                  <button
                    onClick={prevMonth}
                    disabled={canPrevMonth}
                    className="rounded-lg p-1.5 text-roicard-text-muted hover:bg-roicard-bg-muted disabled:opacity-30"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm font-medium text-roicard-text">{calMonthLabel}</span>
                  <button
                    onClick={nextMonth}
                    className="rounded-lg p-1.5 text-roicard-text-muted hover:bg-roicard-bg-muted"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center">
                  {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                    <div key={i} className="py-1 text-[10px] font-medium text-roicard-text-muted">{d}</div>
                  ))}
                  {calendarDays.map((d, i) =>
                    d.day === 0 ? (
                      <div key={`empty-${i}`} />
                    ) : (
                      <button
                        key={d.dateStr}
                        disabled={d.disabled}
                        onClick={() => {
                          setForm((f) => ({ ...f, date: d.dateStr, timeSlot: null }));
                          setStep("time");
                        }}
                        className={cn(
                          "aspect-square rounded-lg text-sm font-medium transition-all",
                          d.disabled
                            ? "text-roicard-text-muted/30 cursor-not-allowed"
                            : form.date === d.dateStr
                            ? "bg-roicard-primary text-roicard-on-primary"
                            : "text-roicard-text hover:bg-roicard-bg-muted"
                        )}
                      >
                        {d.day}
                      </button>
                    )
                  )}
                </div>
              </div>

              <p className="text-center text-xs text-roicard-text-muted">
                Times shown in {tz.replace("_", " ")}
              </p>
            </div>
          )}

          {/* ─── Step: Select Time ─────────────────────────────────── */}
          {step === "time" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold text-roicard-text">Pick a time</h3>
                <p className="mt-0.5 text-sm text-roicard-text-muted">
                  {formatDate(form.date)} &middot; {tz.replace("_", " ")}
                </p>
              </div>

              {slotsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-roicard-primary" />
                </div>
              ) : slotsError ? (
                <div className="rounded-xl border border-amber-300/50 bg-amber-50 p-4 text-center">
                  <AlertCircle className="mx-auto mb-2 h-5 w-5 text-amber-500" />
                  <p className="text-sm text-amber-700">{slotsError}</p>
                  <button
                    onClick={() => setStep("date")}
                    className="mt-2 text-sm font-medium text-roicard-primary hover:underline"
                  >
                    Choose another date
                  </button>
                </div>
              ) : slots.length === 0 ? (
                <div className="rounded-xl border border-roicard-border p-8 text-center">
                  <Clock className="mx-auto mb-2 h-6 w-6 text-roicard-text-muted" />
                  <p className="text-sm text-roicard-text-muted">No available times for this date.</p>
                  <button
                    onClick={() => setStep("date")}
                    className="mt-2 text-sm font-medium text-roicard-primary hover:underline"
                  >
                    Choose another date
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {slots.map((slot) => (
                    <button
                      key={slot.start}
                      onClick={() => setForm((f) => ({ ...f, timeSlot: slot }))}
                      className={cn(
                        "rounded-xl border p-3 text-center text-sm font-medium transition-all",
                        form.timeSlot?.start === slot.start
                          ? "border-roicard-primary bg-roicard-primary/5 text-roicard-primary"
                          : "border-roicard-border text-roicard-text hover:border-roicard-accent/50 hover:bg-roicard-bg-muted"
                      )}
                    >
                      {formatTime(slot.start)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── Step: Guest Info ──────────────────────────────────── */}
          {step === "info" && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-roicard-text">Your details</h3>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-roicard-text">
                    Full name <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-roicard-text-muted" />
                    <input
                      type="text"
                      value={form.guestName}
                      onChange={(e) => setForm((f) => ({ ...f, guestName: e.target.value }))}
                      placeholder="Your name"
                      className="w-full rounded-xl border border-roicard-border bg-roicard-bg py-3 pl-10 pr-4 text-sm text-roicard-text placeholder:text-roicard-text-muted/50 focus:border-roicard-primary focus:outline-none focus:ring-1 focus:ring-roicard-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-roicard-text">
                    Email <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-roicard-text-muted" />
                    <input
                      type="email"
                      value={form.guestEmail}
                      onChange={(e) => setForm((f) => ({ ...f, guestEmail: e.target.value }))}
                      placeholder="you@example.com"
                      className="w-full rounded-xl border border-roicard-border bg-roicard-bg py-3 pl-10 pr-4 text-sm text-roicard-text placeholder:text-roicard-text-muted/50 focus:border-roicard-primary focus:outline-none focus:ring-1 focus:ring-roicard-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-roicard-text">
                    Phone <span className="text-roicard-text-muted">(optional)</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-roicard-text-muted" />
                    <input
                      type="tel"
                      value={form.guestPhone}
                      onChange={(e) => setForm((f) => ({ ...f, guestPhone: e.target.value }))}
                      placeholder="+233..."
                      className="w-full rounded-xl border border-roicard-border bg-roicard-bg py-3 pl-10 pr-4 text-sm text-roicard-text placeholder:text-roicard-text-muted/50 focus:border-roicard-primary focus:outline-none focus:ring-1 focus:ring-roicard-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-roicard-text">
                    Message <span className="text-roicard-text-muted">(optional)</span>
                  </label>
                  <textarea
                    value={form.guestNotes}
                    onChange={(e) => setForm((f) => ({ ...f, guestNotes: e.target.value }))}
                    placeholder="Briefly describe what you'd like to discuss..."
                    rows={3}
                    className="w-full resize-none rounded-xl border border-roicard-border bg-roicard-bg p-3 text-sm text-roicard-text placeholder:text-roicard-text-muted/50 focus:border-roicard-primary focus:outline-none focus:ring-1 focus:ring-roicard-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ─── Step: Custom Questions ─────────────────────────────── */}
          {step === "questions" && form.meetingType && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-roicard-text">A few questions</h3>
              <div className="space-y-3">
                {form.meetingType.custom_questions.map((q) => (
                  <div key={q.id}>
                    <label className="mb-1 block text-sm font-medium text-roicard-text">
                      {q.question}
                      {q.is_required && <span className="text-red-400"> *</span>}
                    </label>
                    <input
                      type="text"
                      value={form.customAnswers[q.id] ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          customAnswers: { ...f.customAnswers, [q.id]: e.target.value },
                        }))
                      }
                      placeholder="Your answer"
                      className="w-full rounded-xl border border-roicard-border bg-roicard-bg p-3 text-sm text-roicard-text placeholder:text-roicard-text-muted/50 focus:border-roicard-primary focus:outline-none focus:ring-1 focus:ring-roicard-primary"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── Step: Review ───────────────────────────────────────── */}
          {step === "review" && form.meetingType && form.timeSlot && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-roicard-text">Confirm your booking</h3>

              <div className="space-y-3 rounded-xl border border-roicard-border p-4">
                <ReviewRow label="Member" value={memberName} />
                <ReviewRow label="Meeting" value={form.meetingType.name} />
                <ReviewRow label="Date" value={formatDate(form.date)} />
                <ReviewRow
                  label="Time"
                  value={`${formatTime(form.timeSlot.start)} – ${formatTime(form.timeSlot.end)} (${tz.replace("_", " ")})`}
                />
                <ReviewRow label="Duration" value={formatDuration(form.meetingType.duration_minutes)} />
                <ReviewRow label="Format" value={form.meetingType.format_label} />
                {form.meetingType.location_detail && (
                  <ReviewRow label="Location" value={form.meetingType.location_detail} />
                )}
                <ReviewRow label="Your name" value={form.guestName} />
                <ReviewRow label="Your email" value={form.guestEmail} />
                {form.guestPhone && <ReviewRow label="Phone" value={form.guestPhone} />}
                {form.guestNotes && <ReviewRow label="Message" value={form.guestNotes} />}
              </div>

              {submitError && (
                <div className="rounded-xl border border-red-300/50 bg-red-50 p-3">
                  <p className="text-sm text-red-700">{submitError}</p>
                </div>
              )}
            </div>
          )}

          {/* ─── Step: Success ──────────────────────────────────────── */}
          {step === "success" && bookingResult && (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                <Check className="h-7 w-7 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-roicard-text">Booking request submitted</h3>
              <p className="text-sm text-roicard-text-muted">
                {memberName} will review your request. You&apos;ll be notified once it&apos;s confirmed.
              </p>

              <div className="mx-auto max-w-xs space-y-2 rounded-xl border border-roicard-border p-4 text-left">
                <ReviewRow label="Status" value="Pending" badge />
                <ReviewRow label="Meeting" value={form.meetingType?.name ?? ""} />
                <ReviewRow label="Date" value={formatDate(form.date)} />
                {form.timeSlot && (
                  <ReviewRow
                    label="Time"
                    value={`${formatTime(form.timeSlot.start)} – ${formatTime(form.timeSlot.end)}`}
                  />
                )}
                <ReviewRow label="Member" value={memberName} />
              </div>
            </div>
          )}

          {/* ─── Step: Error ────────────────────────────────────────── */}
          {step === "error" && (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-7 w-7 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-roicard-text">Something went wrong</h3>
              <p className="text-sm text-roicard-text-muted">
                {submitError || "An unexpected error occurred. Please try again."}
              </p>
            </div>
          )}
        </div>

        {/* ─── Footer buttons ──────────────────────────────────────── */}
        {step !== "success" && step !== "error" && (
          <div className="mt-4 flex gap-3">
            {step !== (meetingTypes.length > 1 ? "type" : "date") && (
              <Button variant="secondary" onClick={goBack} className="flex-1">
                Back
              </Button>
            )}
            <Button
              onClick={goNext}
              disabled={!canGoNext || submitting}
              isLoading={submitting}
              className="flex-1"
            >
              {nextLabel}
            </Button>
          </div>
        )}

        {step === "success" && (
          <div className="mt-4">
            <Button onClick={onClose} fullWidth>
              Done
            </Button>
          </div>
        )}

        {step === "error" && (
          <div className="mt-4 flex gap-3">
            <Button variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={() => { setStep("review"); setSubmitError(null); }} className="flex-1">
              Try Again
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────

function ReviewRow({
  label,
  value,
  badge,
}: {
  label: string;
  value: string;
  badge?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-roicard-text-muted">{label}</span>
      {badge ? (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
          {value}
        </span>
      ) : (
        <span className="text-right font-medium text-roicard-text">{value}</span>
      )}
    </div>
  );
}
