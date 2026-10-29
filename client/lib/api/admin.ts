import apiClient from "./client";
import type { AdminDateRange } from "@/lib/admin/types";

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

export interface AdminUserProfile {
  id?: number;
  user_id?: number;
  slug?: string | null;
  title?: string | null;
  organisation?: string | null;
  avatar_url?: string | null;
  role_description?: string | null;
  bio?: string | null;
  location?: string | null;
  phone?: string | null;
  whatsapp_phone?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  seeking?: string | null;
  offering?: string | null;
  interests?: string[] | null;
  social_links?: AdminSocialLink[] | null;
  education?: AdminEducationEntry[] | null;
  experience?: AdminExperienceEntry[] | null;
  achievements?: AdminAchievementEntry[] | null;
  completion_pct?: number;
  is_live?: boolean;
}

export interface AdminSocialLink {
  platform: string;
  value: string;
}

export interface AdminEducationEntry {
  id?: number;
  institution: string;
  degree: string;
  start_year: number | string;
  end_year?: number | string | null;
  honours?: string | null;
}

export interface AdminExperienceEntry {
  id?: number;
  title: string;
  company: string;
  start_date: string;
  end_date?: string | null;
  location?: string | null;
}

export interface AdminAchievementEntry {
  id?: number;
  title: string;
  issuer?: string | null;
  date?: string | null;
}

export interface AdminPayment {
  id: number;
  amount: number;
  currency: string;
  method: string | null;
  momo_number: string | null;
  status: string;
  provider: string;
  provider_reference: string;
  created_at: string | null;
}

export interface AdminUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  role: string;
  campaign_code?: string | null;
  profile?: AdminUserProfile | null;
  email_verified_at?: string | null;
  onboarding_completed?: boolean;
  onboarding_completed_at?: string | null;
  is_deactivated?: boolean;
  deactivated_at?: string | null;
  next_step?: string;
  profile_completion_pct?: number;
  created_at: string;
  payments?: AdminPayment[];
  payment_summary?: {
    count: number;
    successful: number;
    total_paid: number;
    has_paid: boolean;
  };
  smart_card?: AdminSmartCard | null;
}

export interface AdminUserListResponse {
  data: AdminUser[];
  current_page?: number;
  last_page?: number;
  per_page?: number;
  total?: number;
}

export interface AdminSmartCard {
  id: number;
  card_id: string;
  user_id: number | null;
  status: string;
  inventory_status: string;
  assigned_at: string | null;
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
  public_profile_url?: string | null;
  public_profile_qr_url?: string | null;
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
  current_page?: number;
  last_page?: number;
  per_page?: number;
  total?: number;
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

export interface AdminUserUpsertPayload {
  first_name?: string;
  last_name?: string;
  email?: string;
  username?: string | null;
  password?: string;
  password_confirmation?: string;
  status?: "draft" | "active";
  role?: "member" | "admin";
  campaign_code?: string | null;
  onboarding_completed?: boolean;
  email_verified?: boolean;
  account_access?: "active" | "suspended";
  send_welcome_email?: boolean;
}

export async function getAdminUser(
  id: number
): Promise<{ data: AdminUser }> {
  const { data } = await apiClient.get(`/admin/users/${id}`);
  return data;
}

export async function createAdminUser(
  body: AdminUserUpsertPayload & {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    password_confirmation: string;
  }
): Promise<{ user: AdminUser; message: string }> {
  const { data } = await apiClient.post("/admin/users", body);
  return data;
}

export async function updateAdminUser(
  id: number,
  body: AdminUserUpsertPayload
): Promise<{ user: AdminUser; message: string }> {
  const { data } = await apiClient.patch(`/admin/users/${id}`, body);
  return data;
}

export async function uploadAdminUserAvatar(
  id: number,
  file: File
): Promise<{ url: string | null }> {
  const form = new FormData();
  form.append("avatar", file);
  const { data } = await apiClient.post(`/admin/users/${id}/avatar`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function deleteAdminUserAvatar(
  id: number
): Promise<{ url: null; message: string }> {
  const { data } = await apiClient.delete(`/admin/users/${id}/avatar`);
  return data;
}

export interface AdminUserProfilePayload {
  first_name?: string;
  last_name?: string;
  title?: string;
  organisation?: string;
  role_description?: string;
  bio?: string;
  location?: string;
  phone?: string;
  whatsapp_phone?: string;
  date_of_birth?: string | null;
  gender?: string | null;
  seeking?: string;
  offering?: string;
  interests?: string;
  social_links?: string;
  education?: AdminEducationEntry[];
  experience?: AdminExperienceEntry[];
  achievements?: AdminAchievementEntry[];
  send_welcome_email?: boolean;
  mark_onboarding_complete?: boolean;
}

export async function updateAdminUserProfile(
  id: number,
  body: AdminUserProfilePayload
): Promise<{ user: AdminUser; profile: unknown; message: string }> {
  const { data } = await apiClient.patch(`/admin/users/${id}/profile`, body);
  return data;
}

export async function deleteAdminUser(id: number): Promise<{ message: string }> {
  const { data } = await apiClient.delete(`/admin/users/${id}`);
  return data;
}

export async function sendAdminUserPasswordReset(
  id: number
): Promise<{ message: string }> {
  const { data } = await apiClient.post(`/admin/users/${id}/password-reset`);
  return data;
}

export async function getAdminSmartCards(params?: {
  page?: number;
  per_page?: number;
}): Promise<PaginatedResponse<AdminSmartCard>> {
  const { data } = await apiClient.get("/admin/smart-cards", { params });
  return data;
}

export async function registerSmartCard(body: {
  card_id?: string;
}): Promise<{ smart_card: AdminSmartCard; message: string }> {
  const { data } = await apiClient.post("/admin/smart-cards", body);
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

export async function activateSmartCard(id: number): Promise<{ smart_card: AdminSmartCard; message: string }> {
  const { data } = await apiClient.patch(`/admin/smart-cards/${id}/activate`);
  return data;
}

export async function deactivateSmartCard(id: number): Promise<{ smart_card: AdminSmartCard; message: string }> {
  const { data } = await apiClient.patch(`/admin/smart-cards/${id}/deactivate`);
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

export async function getAdminTrends(
  period: AdminDateRange = "30d"
): Promise<AdminTrends> {
  const { data } = await apiClient.get("/admin/stats/trends", {
    params: { period },
  });
  return data;
}

export interface AdminDiscountCampaign {
  id: number;
  code: string;
  name: string;
  amount: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  users_count?: number;
  created_at?: string;
}

export interface DiscountCampaignPayload {
  code: string;
  name: string;
  amount: number;
  starts_at?: string | null;
  expires_at?: string | null;
  is_active?: boolean;
}

export async function getAdminDiscountCampaigns(): Promise<{
  campaigns: AdminDiscountCampaign[];
}> {
  const { data } = await apiClient.get("/admin/discount-campaigns");
  return data;
}

export async function createAdminDiscountCampaign(
  body: DiscountCampaignPayload
): Promise<{ campaign: AdminDiscountCampaign; message: string }> {
  const { data } = await apiClient.post("/admin/discount-campaigns", body);
  return data;
}

export async function updateAdminDiscountCampaign(
  id: number,
  body: Partial<DiscountCampaignPayload>
): Promise<{ campaign: AdminDiscountCampaign; message: string }> {
  const { data } = await apiClient.patch(`/admin/discount-campaigns/${id}`, body);
  return data;
}

/* -------------------------------------------------------------------------- */
/* Manual member messages                                                      */
/* -------------------------------------------------------------------------- */

export type AdminMessageCategory = "service" | "nudge";

export type AdminMessageAudienceFilters = {
  status?: "draft" | "active";
  onboarding_completed?: boolean;
  email_verified?: boolean;
  has_campaign_code?: boolean;
  campaign_code?: string;
  created_from?: string;
  created_to?: string;
  search?: string;
};

export interface AdminMessageRecipientPreview {
  id: number;
  first_name: string;
  last_name: string;
  name: string;
  email: string;
  status: string;
  role: string;
  campaign_code: string | null;
  onboarding_completed: boolean;
  email_verified: boolean;
  created_at: string | null;
  draft_closes_at: string | null;
  draft_days_remaining: number | null;
}

export interface AdminMessageQuota {
  daily_limit: number;
  monthly_limit: number;
  committed_today: number;
  committed_month: number;
  daily_remaining: number;
  monthly_remaining: number;
  tracked_only: boolean;
}

export interface AdminMessage {
  id: number;
  sent_by: number | null;
  sent_by_name: string | null;
  subject: string;
  body: string | null;
  category: AdminMessageCategory;
  filter_snapshot: Record<string, unknown> | null;
  recipient_count: number;
  skipped_count: number;
  queued_count: number;
  sent_count: number;
  failed_count: number;
  queued_recipients_count: number;
  sent_recipients_count: number;
  failed_recipients_count: number;
  status: "queued" | "sending" | "sent" | "partial" | "failed";
  is_stuck: boolean;
  started_at: string | null;
  completed_at: string | null;
  created_at: string | null;
}

export interface AdminMessageRecipient {
  id: number;
  user_id: number | null;
  name: string | null;
  email: string;
  status: "queued" | "sending" | "sent" | "failed";
  error: string | null;
  attempts: number;
  sent_at: string | null;
}

export interface AdminMessagePreview {
  subject: string;
  text: string;
  body_html: string;
  html: string;
  recipient: { id: number; name: string; email: string } | null;
}

export interface AdminMessageAudiencePayload {
  filters?: AdminMessageAudienceFilters;
  include_user_ids?: number[];
  exclude_user_ids?: number[];
  include_admins?: boolean;
}

export async function getAdminMessageRecipients(
  params: AdminMessageAudienceFilters & { page?: number; per_page?: number; include_admins?: boolean }
): Promise<{
  count: number;
  total: number;
  data: AdminMessageRecipientPreview[];
  current_page: number;
  last_page: number;
  per_page: number;
}> {
  const { data } = await apiClient.get("/admin/messages/recipients", { params });
  return data;
}

export async function getAdminMessageQuota(): Promise<AdminMessageQuota> {
  const { data } = await apiClient.get("/admin/messages/quota");
  return data;
}

export async function checkAdminMessageDuplicates(
  subject: string,
  audience: AdminMessageAudiencePayload
): Promise<{ count: number; window_days: number; recipients: AdminMessageRecipientPreview[] }> {
  const { data } = await apiClient.get("/admin/messages/duplicate-check", {
    params: {
      subject,
      ...audience.filters,
      include_admins: audience.include_admins,
      include_user_ids: audience.include_user_ids,
      exclude_user_ids: audience.exclude_user_ids,
    },
  });
  return data;
}

export async function previewAdminMessage(body: {
  subject: string;
  body: string;
  category: AdminMessageCategory;
  user_id?: number;
}): Promise<AdminMessagePreview> {
  const { data } = await apiClient.post("/admin/messages/preview", body);
  return data;
}

export async function sendAdminMessageTest(body: {
  subject: string;
  body: string;
  category: AdminMessageCategory;
}): Promise<{ message: string; email: string }> {
  const { data } = await apiClient.post("/admin/messages/test", body);
  return data;
}

export async function createAdminMessage(
  body: {
    subject: string;
    body: string;
    category: AdminMessageCategory;
    expected_recipient_count: number;
    confirmation_text?: string;
    acknowledge_duplicates?: boolean;
  } & AdminMessageAudiencePayload,
  idempotencyKey: string
): Promise<AdminMessage> {
  const { data } = await apiClient.post("/admin/messages", body, {
    headers: { "Idempotency-Key": idempotencyKey },
  });
  return data;
}

export async function getAdminMessages(params?: {
  page?: number;
  per_page?: number;
  status?: string;
  search?: string;
}): Promise<{
  data: AdminMessage[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}> {
  const { data } = await apiClient.get("/admin/messages", { params });
  return data;
}

export async function getAdminMessage(
  id: number,
  params?: { page?: number; per_page?: number; status?: string; search?: string }
): Promise<{
  message: AdminMessage;
  recipients: AdminMessageRecipient[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}> {
  const { data } = await apiClient.get(`/admin/messages/${id}`, { params });
  return data;
}

export async function retryAdminMessage(
  id: number,
  idempotencyKey: string
): Promise<{ message: string; queued_count: number }> {
  const { data } = await apiClient.post(
    `/admin/messages/${id}/retry`,
    {},
    { headers: { "Idempotency-Key": idempotencyKey } }
  );
  return data;
}

