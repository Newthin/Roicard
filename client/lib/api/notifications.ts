import apiClient from "./client";

export interface Notification {
  id: string;
  type: string;
  data: {
    type?: string;
    title?: string;
    body?: string;
    connection_id?: number;
    card_id?: string;
    [key: string]: unknown;
  };
  read_at: string | null;
  created_at: string;
}

export async function getNotifications(): Promise<{
  notifications: Notification[];
  unread_count: number;
}> {
  const { data } = await apiClient.get("/notifications");
  return {
    notifications: data.notifications?.data ?? data.notifications ?? [],
    unread_count: data.unread_count ?? 0,
  };
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiClient.patch(`/notifications/${id}/read`);
}
