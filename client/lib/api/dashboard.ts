import apiClient from "./client";

export interface DashboardData {
  user: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    status: string;
    role: string;
    /** ISO timestamp — when an unfinished draft will be closed; null otherwise */
    draft_closes_at?: string | null;
    plan?: string;
    membership_status?: string;
    is_founding_member?: boolean;
    has_active_subscription?: boolean;
  };
  profile: Record<string, unknown> | null;
  smart_card: Record<string, unknown> | null;
  stats: {
    total_views: number;
    connections: number;
    pending_connections: number;
    unread_notifications: number;
    meeting_types: number;
    upcoming_bookings: number;
    pending_bookings: number;
  };
}

export async function getDashboard(): Promise<DashboardData> {
  const { data } = await apiClient.get("/dashboard");
  return data;
}
