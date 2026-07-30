import apiClient from "./client";

export interface Notification {
  id: string;
  type: string;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export async function getNotifications(): Promise<{
  notifications: Notification[];
  unread_count: number;
}> {
  const { data } = await apiClient.get("/notifications");
  return data;
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiClient.patch(`/notifications/${id}/read`);
}
