import apiClient from "./client";

export interface AnalyticsSummary {
  total_views: number;
  profile_views: number;
  card_taps: number;
  qr_scans: number;
  connection_requests: number;
  contact_saves: number;
  whatsapp_taps: number;
  total: number;
  period: string;
}

export async function getAnalyticsSummary(period = "30d"): Promise<AnalyticsSummary> {
  const { data } = await apiClient.get("/analytics/summary", { params: { period } });
  return data;
}
