import apiClient from "./client";
import type { MembershipSummary, PlanQuote } from "./plans";

export interface BillingInvoice {
  id: number;
  reference: string;
  plan: string | null;
  plan_name: string | null;
  purpose: string;
  amount: number;
  currency: string;
  method: string | null;
  status: "pending" | "success" | "failed";
  period_start: string | null;
  period_end: string | null;
  paid_at: string | null;
  created_at: string | null;
}

export interface BillingSummary {
  membership: MembershipSummary;
  quotes: Record<string, PlanQuote>;
  invoices: BillingInvoice[];
  payment_methods: { value: string; label: string }[];
}

export async function getBilling(): Promise<BillingSummary> {
  const { data } = await apiClient.get<BillingSummary>("/billing");
  return data;
}

export async function getInvoices(perPage = 20) {
  const { data } = await apiClient.get("/billing/invoices", {
    params: { per_page: perPage },
  });
  return data;
}

export async function quotePlan(plan: string): Promise<PlanQuote> {
  const { data } = await apiClient.post<{ quote: PlanQuote }>("/billing/quote", {
    plan,
  });
  return data.quote;
}

export async function cancelSubscription(): Promise<{
  message: string;
  membership: MembershipSummary;
}> {
  const { data } = await apiClient.post("/billing/cancel");
  return data;
}

export async function resumeSubscription(): Promise<{
  message: string;
  membership: MembershipSummary;
}> {
  const { data } = await apiClient.post("/billing/resume");
  return data;
}
