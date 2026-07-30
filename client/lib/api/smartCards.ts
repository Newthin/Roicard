import apiClient from "./client";

export interface SmartCard {
  id: number;
  card_id: string;
  user_id: number;
  status: string;
  delivery_name: string;
  street_address: string;
  city: string;
  region: string;
  country: string;
  gps_address: string | null;
  delivery_phone: string;
  delivery_notes: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function submitDelivery(
  payload: Record<string, unknown>
): Promise<{ smart_card: SmartCard; message: string }> {
  const { data } = await apiClient.post("/smart-cards/delivery", payload);
  return data;
}
