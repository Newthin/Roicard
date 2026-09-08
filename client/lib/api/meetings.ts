import apiClient from "./client";

// ─── Types ──────────────────────────────────────────────────────────────

export interface MeetingTypeAvailability {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface MeetingTypeCustomQuestion {
  id: number;
  question: string;
  is_required: boolean;
}

export interface MeetingType {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  duration_minutes: number;
  format: string;
  format_label: string;
  location_detail: string | null;
  phone_number: string | null;
  meeting_link: string | null;
  buffer_minutes: number;
  capacity: number;
  is_active: boolean;
  sort_order: number;
  min_notice_hours: number;
  advance_booking_days: number;
  max_bookings_per_day: number | null;
  availability: MeetingTypeAvailability[];
  custom_questions: MeetingTypeCustomQuestion[];
}

export interface MeetingBooking {
  id: number;
  meeting_type_id: number;
  host_user_id: number;
  guest_user_id: number | null;
  status: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  guest_notes: string | null;
  start_time: string;
  end_time: string;
  timezone: string;
  host_timezone: string | null;
  type_name: string;
  type_description: string | null;
  type_duration_minutes: number;
  type_format: string;
  type_location_detail: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  confirmed_at: string | null;
  host_notes: string | null;
  meeting_type?: MeetingType;
  custom_answers?: { id: number; question: string; answer: string }[];
  reschedule_requests?: RescheduleRequest[];
}

export interface RescheduleRequest {
  id: number;
  booking_id: number;
  requested_by_user_id: number;
  proposed_start_time: string;
  proposed_end_time: string;
  status: string;
  reason: string | null;
  responded_at: string | null;
  requested_by?: { id: number; first_name: string; last_name: string; email: string };
}

export interface BlockedDate {
  id: number;
  user_id: number;
  start_date: string;
  end_date: string | null;
  reason: string | null;
}

// ─── Meeting Types ──────────────────────────────────────────────────────

export async function getMeetingTypes(): Promise<MeetingType[]> {
  const { data } = await apiClient.get("/meeting-types");
  return data.data;
}

export async function getMeetingType(id: number): Promise<MeetingType> {
  const { data } = await apiClient.get(`/meeting-types/${id}`);
  return data.data;
}

export async function createMeetingType(payload: Partial<MeetingType> & { availability?: Partial<MeetingTypeAvailability>[]; custom_questions?: { question: string; is_required?: boolean }[] }): Promise<MeetingType> {
  const { data } = await apiClient.post("/meeting-types", payload);
  return data.data;
}

export async function updateMeetingType(id: number, payload: Partial<MeetingType> & { availability?: Partial<MeetingTypeAvailability>[]; custom_questions?: { question: string; is_required?: boolean }[] }): Promise<MeetingType> {
  const { data } = await apiClient.patch(`/meeting-types/${id}`, payload);
  return data.data;
}

export async function deleteMeetingType(id: number): Promise<void> {
  await apiClient.delete(`/meeting-types/${id}`);
}

// ─── Bookings ───────────────────────────────────────────────────────────

export async function getBookings(params?: { status?: string; upcoming?: boolean }): Promise<{ data: MeetingBooking[]; current_page: number; last_page: number; total: number }> {
  const { data } = await apiClient.get("/meetings", { params });
  return data;
}

export async function getBooking(id: number): Promise<MeetingBooking> {
  const { data } = await apiClient.get(`/meetings/${id}`);
  return data.data;
}

export async function confirmBooking(id: number): Promise<MeetingBooking> {
  const { data } = await apiClient.patch(`/meetings/${id}/confirm`);
  return data.data;
}

export async function declineBooking(id: number, reason?: string): Promise<MeetingBooking> {
  const { data } = await apiClient.patch(`/meetings/${id}/decline`, { reason });
  return data.data;
}

export async function cancelBooking(id: number, reason?: string): Promise<MeetingBooking> {
  const { data } = await apiClient.patch(`/meetings/${id}/cancel`, { reason });
  return data.data;
}

// ─── Reschedule ─────────────────────────────────────────────────────────

export async function proposeReschedule(bookingId: number, proposedStartTime: string, reason?: string): Promise<RescheduleRequest> {
  const { data } = await apiClient.post(`/meetings/${bookingId}/reschedule`, {
    proposed_start_time: proposedStartTime,
    reason,
  });
  return data.data;
}

export async function acceptReschedule(bookingId: number, requestId: number): Promise<MeetingBooking> {
  const { data } = await apiClient.patch(`/meetings/${bookingId}/reschedule/${requestId}/accept`);
  return data.data;
}

export async function declineReschedule(bookingId: number, requestId: number): Promise<RescheduleRequest> {
  const { data } = await apiClient.patch(`/meetings/${bookingId}/reschedule/${requestId}/decline`);
  return data.data;
}

// ─── Blocked Dates ──────────────────────────────────────────────────────

export async function getBlockedDates(): Promise<BlockedDate[]> {
  const { data } = await apiClient.get("/blocked-dates");
  return data.data;
}

export async function createBlockedDate(payload: { start_date: string; end_date?: string; reason?: string }): Promise<BlockedDate> {
  const { data } = await apiClient.post("/blocked-dates", payload);
  return data.data;
}

export async function deleteBlockedDate(id: number): Promise<void> {
  await apiClient.delete(`/blocked-dates/${id}`);
}

// ─── Slots ──────────────────────────────────────────────────────────────

export async function getAvailableSlots(typeId: number, from: string, to: string): Promise<{ start: string; end: string }[]> {
  const { data } = await apiClient.get(`/meeting-types/${typeId}/slots`, { params: { from, to } });
  return data.data;
}
