/**
 * Connection persistence (API-backed).
 *
 * Sources the authenticated user's guest connection requests and established
 * connections from the ROICARD backend, replacing the previous localStorage
 * implementation.
 */

import {
  createConnection,
  getConnections as fetchApiConnections,
  updateConnection,
  type Connection as ApiConnection,
} from "@/lib/api/connections";
import type { ConnectionRequestData } from "@/lib/profile/types";
import type {
  Connection,
  ConnectionPerson,
  ConnectionSummary,
  IncomingConnectionRequest,
} from "@/lib/connections/types";

/** Map an API guest connection into the shared person shape. */
function toConnectionPerson(api: ApiConnection): ConnectionPerson {
  const [firstName, ...rest] = api.guest_name.trim().split(" ");
  const lastName = rest.join(" ") || "";
  return {
    id: String(api.id),
    username: api.guest_user?.profile?.slug ?? undefined,
    firstName,
    lastName,
    profilePhotoUrl: null,
    professionalTitle: "",
    organization: api.guest_org || "",
    email: api.guest_email,
    phone: api.guest_phone || undefined,
    guestUserId: api.guest_user_id ? String(api.guest_user_id) : undefined,
    meetingContext: api.guest_meeting_context || undefined,
  };
}

/** Pending guest requests awaiting accept/decline. */
export async function getIncomingRequests(): Promise<
  IncomingConnectionRequest[]
> {
  const { connections } = await fetchApiConnections();
  const list = Array.isArray(connections) ? connections : connections.data;
  return list
    .filter((c) => c.status === "pending")
    .map((c) => ({
      id: String(c.id),
      person: toConnectionPerson(c),
      meetingContext: c.guest_meeting_context || undefined,
      requestedAt: c.created_at,
    }));
}

/** Established (approved) connections for the current user. */
export async function getConnections(): Promise<Connection[]> {
  const { connections } = await fetchApiConnections();
  const list = Array.isArray(connections) ? connections : connections.data;
  return list
    .filter((c) => c.status === "approved")
    .map((c) => ({
      id: String(c.id),
      person: toConnectionPerson(c),
      connectedAt: c.updated_at,
    }));
}

/** Accepts a request — approves the guest connection on the backend. */
export async function acceptRequest(requestId: string): Promise<void> {
  await updateConnection(Number(requestId), "approve");
}

/** Declines a request — marks the guest connection declined on the backend. */
export async function declineRequest(requestId: string): Promise<void> {
  await updateConnection(Number(requestId), "decline");
}

/**
 * Guest public profile submit — posts the request to the profile owner's
 * connection inbox via the backend.
 */
export async function addGuestConnectionRequest(
  slug: string,
  data: ConnectionRequestData
): Promise<void> {
  await createConnection({
    slug,
    guest_name: data.name,
    guest_email: data.email,
    guest_phone: data.phone || undefined,
    guest_org: data.organization || undefined,
    guest_meeting_context: data.meetingContext || undefined,
  });
}

/** Summary stats for dashboard cards. */
export async function getConnectionSummary(): Promise<ConnectionSummary> {
  const [requests, connections] = await Promise.all([
    getIncomingRequests(),
    getConnections(),
  ]);

  return {
    pendingCount: requests.length,
    totalConnections: connections.length,
    recentConnections: [...connections]
      .sort(
        (a, b) =>
          new Date(b.connectedAt).getTime() - new Date(a.connectedAt).getTime()
      )
      .slice(0, 3),
  };
}