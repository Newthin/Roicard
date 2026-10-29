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

const PAYMENT_REFERENCE_KEY = "roicard_payment_reference";

/** Remember the in-flight payment so the processing step can poll it. */
export function rememberPaymentReference(reference: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PAYMENT_REFERENCE_KEY, reference);
}

export function getRememberedPaymentReference(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PAYMENT_REFERENCE_KEY);
}

export function clearRememberedPaymentReference(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PAYMENT_REFERENCE_KEY);
}

/**
 * Confirms a pending payment in mock mode (local/staging only). The server
 * returns 404 when a real provider is configured, so this can never activate
 * an account without a real payment in production.
 */
export async function confirmMockPayment(reference: string): Promise<{
  status: string;
  payment: Payment;
}> {
  const { data } = await apiClient.post("/payments/mock/confirm", { reference });
  return data;
}
