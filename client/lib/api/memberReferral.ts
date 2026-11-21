import apiClient from "./client";

export interface MemberReferralLink {
  id: number;
  user_id: number;
  code: string;
  url: string;
  qr_url: string;
  created_at: string | null;
}

export interface MemberReferralSummary {
  currency: string;
  clicks: number;
  registered_members: number;
  credits_earned: string;
  credits_used: string;
  available_balance: string;
  cancelled_amount: string;
}

export interface MemberAttributedMember {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  plan: string | null;
  plan_name: string | null;
  membership_status: string | null;
  referred_at: string | null;
}

export interface MemberReferralCredit {
  id: number;
  member: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  amount: string;
  currency: string;
  status: "available" | "reserved" | "used" | "cancelled" | "expired" | "adjustment";
  payment_reference: string | null;
  expires_at: string | null;
  created_at: string | null;
  used_at: string | null;
}

export interface MemberRecentClick {
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

export interface MemberReferralDashboard {
  eligible: boolean;
  referral: MemberReferralLink | null;
  summary: MemberReferralSummary;
  attributed_members: MemberAttributedMember[];
  credits: MemberReferralCredit[];
  recent_clicks: MemberRecentClick[];
}

/** Referral assets for the authenticated member. */
export async function getMemberReferral(): Promise<MemberReferralLink> {
  const { data } = await apiClient.get<{
    eligible: boolean;
    referral: MemberReferralLink;
  }>("/referrals/me");
  return data.referral;
}

/** Read-only performance and non-cash credit history. */
export async function getMemberReferralDashboard(): Promise<MemberReferralDashboard> {
  const { data } = await apiClient.get<{ dashboard: MemberReferralDashboard }>(
    "/referrals/dashboard"
  );
  return data.dashboard;
}
