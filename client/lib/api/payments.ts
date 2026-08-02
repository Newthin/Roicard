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

/** Generate a per-attempt idempotency key (RFC 4122 v4-ish, crypto-safe). */
function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback for older browsers.
  return (
    Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12)
  );
}

export async function initiatePayment(payload: {
  amount: number;
  currency?: string;
  method?: string;
  momo_number?: string;
}): Promise<{ payment: Payment; redirect: Record<string, unknown> }> {
  const { data } = await apiClient.post("/payments/initiate", payload, {
    headers: { "Idempotency-Key": generateIdempotencyKey() },
  });
  return data;
}

export async function getPaymentStatus(reference: string): Promise<{ status: string; payment: Payment }> {
  const { data } = await apiClient.get(`/payments/status/${reference}`);
  return data;
}
