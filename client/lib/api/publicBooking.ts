import apiClient from "./client";

// ─── Types ──────────────────────────────────────────────────────────────

export interface PublicMeetingType {
  id: number;
  name: string;
  description: string | null;
  duration_minutes: number;
  format: string;
  format_label: string;
  location_detail: string | null;
  custom_questions: {
    id: number;
    question: string;
    is_required: boolean;
  }[];
}

export interface TimeSlot {
  start: string;
  end: string;
}

export interface BookingResult {
  id: number;
  status: string;
  start_time: string;
  end_time: string;
  guest_name: string;
  guest_email: string;
  cancellation_url: string;
}

// ─── API Functions ──────────────────────────────────────────────────────

/** Get active meeting types for a member's public profile (no auth). */
export async function getPublicMeetingTypes(slug: string): Promise<PublicMeetingType[]> {
  const { data } = await apiClient.get(`/public/${slug}/meeting-types`);
  return data.data;
}

/** Get available time slots for a meeting type within a date range (no auth). */
export async function getPublicSlots(
  slug: string,
  meetingTypeId: number,
  from: string,
  to: string
): Promise<TimeSlot[]> {
  const { data } = await apiClient.get(
    `/public/${slug}/meeting-types/${meetingTypeId}/slots`,
    { params: { from, to } }
  );
  return data.data;
}

/** Submit a public booking request (no auth, idempotent). */
export async function submitPublicBooking(
  slug: string,
  meetingTypeId: number,
  payload: {
    guest_name: string;
    guest_email: string;
    guest_phone?: string;
    guest_notes?: string;
    start_time: string;
    timezone: string;
    format?: string;
    custom_answers?: { question_id: number; answer: string }[];
  }
): Promise<BookingResult> {
  const { data } = await apiClient.post(
    `/public/${slug}/meeting-types/${meetingTypeId}/book`,
    payload
  );
  return data.data;
}
