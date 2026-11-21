import apiClient from "./client";

export type PlanInterval = "none" | "month" | "year";

export interface PlanSchedule {
  year_one: number;
  year_two_plus: number | null;
  savings_vs_monthly: number | null;
}

export interface PlanQuote {
  plan_code: string;
  plan_name: string;
  currency: string;
  purpose: "initial" | "renewal" | "upgrade" | "none";
  amount: number;
  original_amount: number;
  discount_amount: number;
  credit_applied: number;
  initial_price: number;
  recurring_price: number;
  interval: PlanInterval;
  includes_card: boolean;
  period_start: string | null;
  period_end: string | null;
  next_payment_at: string | null;
  requires_payment: boolean;
  is_renewal: boolean;
  is_upgrade: boolean;
  blocked_reason: string | null;
  blocked_code: string | null;
  campaign: { code: string; name: string; amount: number } | null;
  schedule: PlanSchedule;
}

export interface Plan {
  code: string;
  name: string;
  description: string | null;
  currency: string;
  initial_price: number;
  price: number;
  interval: PlanInterval;
  includes_card: boolean;
  is_active: boolean;
  is_public: boolean;
  sort_order: number;
  features?: Record<string, boolean | number | null>;
  schedule: PlanSchedule;
  highlight?: boolean;
  quote?: PlanQuote;
}

export interface MembershipSummary {
  plan: string;
  plan_name: string;
  status: string;
  is_active: boolean;
  is_founding: boolean;
  started_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  grace_ends_at: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  ended_at: string | null;
  renews_at: string | null;
  days_remaining: number | null;
  includes_card: boolean;
  price: number;
  interval: PlanInterval | null;
  features: Record<string, boolean | number | null>;
  limits: { cv_entries: number | null; experience_entries: number | null };
}

export interface PlansResponse {
  plans: Plan[];
  currency: string;
  annual_savings: {
    year_one_amount: number;
    year_one_percent: number;
    year_two_amount: number;
    year_two_percent: number;
  } | null;
  membership: MembershipSummary | null;
}

/** Public plan catalogue; sends the bearer token when present for quotes. */
export async function getPlans(): Promise<PlansResponse> {
  const { data } = await apiClient.get<PlansResponse>("/plans");
  return data;
}
