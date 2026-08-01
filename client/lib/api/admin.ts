import apiClient from "./client";

export interface AdminStats {
  total_users: number;
  active_users: number;
  draft_users: number;
  total_payments: number;
  successful_payments: number;
  total_revenue: number;
  total_smart_cards: number;
  cards_shipped: number;
  cards_delivered: number;
  total_connections: number;
  total_analytics_events: number;
  recent_views_7d: number;
}

export interface AdminUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  role: string;
  profile?: {
    slug?: string;
    title?: string;
    organisation?: string;
  };
  created_at: string;
}

export interface AdminUserListResponse {
  data: AdminUser[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface AdminSmartCard {
  id: number;
  card_id: string;
  user_id: number | null;
  status: string;
  delivery_name: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  created_at: string;
  user?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

export interface AdminConnection {
  id: number;
  member_id: number;
  guest_name: string | null;
  guest_email: string | null;
  status: string;
  created_at: string;
  member?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

export interface AdminActivityLogEntry {
  id: number;
  action: string;
  created_at: string;
  admin?: {
    id: number;
    first_name: string;
    last_name: string;
  } | null;
  target_user?: {
    id: number;
    first_name: string;
    last_name: string;
  } | null;
}

export interface AdminTrends {
  usersGrowth: { label: string; value: number }[];
  connectionsGrowth: { label: string; value: number }[];
  nfcUsage: { label: string; value: number }[];
  profileViewTrends: { label: string; value: number }[];
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export async function getAdminStats(): Promise<AdminStats> {
  const { data } = await apiClient.get("/admin/stats");
  return data;
}

export async function getAdminUsers(params?: {
  page?: number;
  per_page?: number;
  filter?: Record<string, string>;
  sort?: string;
}): Promise<AdminUserListResponse> {
  const { data } = await apiClient.get("/admin/users", { params });
  return data;
}

export async function createAdminUser(body: {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  password_confirmation: string;
  status: "draft" | "active";
  role: "member" | "admin";
}): Promise<{ user: AdminUser; message: string }> {
  const { data } = await apiClient.post("/admin/users", body);
  return data;
}

export async function updateAdminUser(
  id: number,
  body: { status?: string; role?: string }
): Promise<{ user: AdminUser; message: string }> {
  const { data } = await apiClient.patch(`/admin/users/${id}`, body);
  return data;
}

export async function getAdminSmartCards(params?: {
  page?: number;
  per_page?: number;
}): Promise<PaginatedResponse<AdminSmartCard>> {
  const { data } = await apiClient.get("/admin/smart-cards", { params });
  return data;
}

export async function assignSmartCard(id: number, userId: number): Promise<{ smart_card: AdminSmartCard; message: string }> {
  const { data } = await apiClient.patch(`/admin/smart-cards/${id}/assign`, { user_id: userId });
  return data;
}

export async function unassignSmartCard(id: number): Promise<{ smart_card: AdminSmartCard; message: string }> {
  const { data } = await apiClient.patch(`/admin/smart-cards/${id}/unassign`);
  return data;
}

export async function dispatchSmartCard(id: number): Promise<{ message: string }> {
  const { data } = await apiClient.patch(`/admin/smart-cards/${id}/dispatch`);
  return data;
}

export async function deliverSmartCard(id: number): Promise<{ message: string }> {
  const { data } = await apiClient.patch(`/admin/smart-cards/${id}/deliver`);
  return data;
}

export async function getAdminConnections(params?: {
  page?: number;
  per_page?: number;
}): Promise<PaginatedResponse<AdminConnection>> {
  const { data } = await apiClient.get("/admin/connections", { params });
  return data;
}

export async function getAdminActivityLog(): Promise<AdminActivityLogEntry[]> {
  const { data } = await apiClient.get("/admin/activity-log");
  return data;
}

export async function getAdminTrends(): Promise<AdminTrends> {
  const { data } = await apiClient.get("/admin/stats/trends");
  return data;
}
