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
