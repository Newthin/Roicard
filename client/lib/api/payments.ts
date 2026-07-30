import apiClient from "./client";

export interface Payment {
  id: number;
  user_id: number;
  amount: string;
  currency: string;
  method: string | null;
  momo_number: string | null;
  status: "pending" | "success" | "failed";
  provider_reference: string;
  provider: string;
  created_at: string;
  updated_at: string;
}

export async function initiatePayment(payload: {
  amount: number;
  currency?: string;
  method?: string;
  momo_number?: string;
}): Promise<{ payment: Payment; redirect: Record<string, unknown> }> {
  const { data } = await apiClient.post("/payments/initiate", payload);
  return data;
}

export async function getPaymentStatus(reference: string): Promise<{ status: string; payment: Payment }> {
  const { data } = await apiClient.get(`/payments/status/${reference}`);
  return data;
}
