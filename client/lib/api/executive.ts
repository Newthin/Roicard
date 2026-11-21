import apiClient from "./client";

export interface ExecutiveReferral {
  id: number;
  user_id: number;
  user: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  code: string;
  url: string;
  qr_url: string;
  created_at: string | null;
}

/** Referral assets for the authenticated Executive plan holder. */
export async function getExecutiveReferral(): Promise<ExecutiveReferral> {
  const { data } = await apiClient.get<{ referral: ExecutiveReferral }>(
    "/executive/referral"
  );
  return data.referral;
}

export interface ExecutiveDashboardSummary {
  currency: string;
  clicks: number;
  registered_members: number;
  cleared_commissions_count: number;
  cleared_commissions_total: string;
  unbatched_amount: string;
  pending_approval_amount: string;
  approved_amount: string;
  paid_amount: string;
}

export interface ExecutiveAttributedMember {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  plan: string | null;
  plan_name: string | null;
  membership_status: string | null;
  referred_at: string | null;
}

export interface ExecutiveCommission {
  id: number;
  member: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  type: string;
  amount: string;
  currency: string;
  status: string;
  cleared_at: string | null;
  cancelled_at: string | null;
  payout: {
    batch_id: number;
    status: string | null;
    transfer_reference: string | null;
    paid_at: string | null;
  } | null;
}

export interface ExecutivePayout {
  id: number;
  amount: string;
  currency: string;
  status: "pending" | "approved" | "paid";
  commission_count: number;
  transfer_references: string[];
  created_at: string | null;
  approved_at: string | null;
  paid_at: string | null;
}

export interface ExecutiveRecentClick {
  id: number;
  referrer: string | null;
  user_agent: string | null;
  created_at: string | null;
  registered_user: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

export interface ExecutiveDashboardData {
  referral: ExecutiveReferral;
  summary: ExecutiveDashboardSummary;
  attributed_members: ExecutiveAttributedMember[];
  commissions: ExecutiveCommission[];
  payouts: ExecutivePayout[];
  recent_clicks: ExecutiveRecentClick[];
}

/** Read-only performance and payout dashboard for the authenticated Executive. */
export async function getExecutiveDashboard(): Promise<ExecutiveDashboardData> {
  const { data } = await apiClient.get<{ dashboard: ExecutiveDashboardData }>(
    "/executive/dashboard"
  );
  return data.dashboard;
}
