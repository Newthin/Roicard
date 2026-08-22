import apiClient from "./client";

export interface DashboardData {
  user: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    status: string;
    role: string;
    /** ISO timestamp — when the draft account will be closed; null when active */
    draft_closes_at?: string | null;
  };
  profile: Record<string, unknown> | null;
  smart_card: Record<string, unknown> | null;
  stats: {
    total_views: number;
    connections: number;
    pending_connections: number;
    unread_notifications: number;
  };
}

export async function getDashboard(): Promise<DashboardData> {
  const { data } = await apiClient.get("/dashboard");
  return data;
}
