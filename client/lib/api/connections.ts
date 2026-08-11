import apiClient from "./client";

export interface ConnectionUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  profile?: {
    id: number;
    user_id: number;
    slug: string | null;
    title: string | null;
    organisation: string | null;
  } | null;
}

export interface Connection {
  id: number;
  member_id: number;
  guest_user_id: number | null;
  direction: "received" | "sent";
  member?: ConnectionUser | null;
  guest_user?: ConnectionUser | null;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  guest_org: string | null;
  guest_meeting_context: string | null;
  guest_introduction: string | null;
  guest_intent: string | null;
  status: "pending" | "approved" | "declined";
  created_at: string;
  updated_at: string;
}

export async function getConnections(): Promise<{
  connections: {
    data: Connection[];
  };
}> {
  const { data } = await apiClient.get("/connections");
  return data;
}

export async function createConnection(payload: {
  slug: string;
  guest_name: string;
  guest_email: string;
  guest_phone?: string;
  guest_org?: string;
  guest_meeting_context?: string;
  guest_introduction?: string;
  guest_intent?: string;
}): Promise<{ connection: Connection; message: string }> {
  const { data } = await apiClient.post("/connections", payload);
  return data;
}

export async function updateConnection(
  id: number,
  action: "approve" | "decline"
): Promise<{ connection: Connection; message: string }> {
  const { data } = await apiClient.patch(`/connections/${id}`, { action });
  return data;
}