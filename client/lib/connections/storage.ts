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

function fullName(first?: string, last?: string): string {
  return [first, last].filter(Boolean).join(" ") || "Member";
}

/**
 * Resolve the "other party" for a connection row relative to the viewer.
 *
 * A row is created once (direction "received" for the profile owner, "sent"
 * for the requester). After acceptance both sides see the same record, and
 * each side should render — and link through to — the *other* person's real
 * profile.
 */
function toConnectionPerson(api: ApiConnection): ConnectionPerson {
  const direction = api.direction ?? "received";

  if (direction === "sent" && api.member) {
    const member = api.member;
    return {
      id: String(api.id),
      username: member.profile?.slug ?? undefined,
      firstName: member.first_name,
      lastName: member.last_name,
      profilePhotoUrl: member.profile?.avatar_url || null,
      professionalTitle: member.profile?.title ?? "",
      organization: member.profile?.organisation ?? "",
      email: member.email,
      guestUserId: String(api.member_id),
      meetingContext: api.guest_meeting_context || undefined,
      introduction: api.guest_introduction || undefined,
      intent: api.guest_intent || undefined,
    };
  }

  // "received" (or fallback): the other party is the requesting guest.
  const [firstName, ...rest] = api.guest_name.trim().split(" ");
  const lastName = rest.join(" ") || "";
  return {
    id: String(api.id),
    username: api.guest_user?.profile?.slug ?? undefined,
    firstName,
    lastName,
    profilePhotoUrl: api.guest_user?.profile?.avatar_url || null,
    professionalTitle: api.guest_user?.profile?.title ?? "",
    organization: api.guest_org || api.guest_user?.profile?.organisation || "",
    email: api.guest_email,
    phone: api.guest_phone || undefined,
    guestUserId: api.guest_user_id ? String(api.guest_user_id) : undefined,
    meetingContext: api.guest_meeting_context || undefined,
    introduction: api.guest_introduction || undefined,
    intent: api.guest_intent || undefined,
  };
}

function toRequest(api: ApiConnection): IncomingConnectionRequest {
  return {
    id: String(api.id),
    person: toConnectionPerson(api),
    meetingContext: api.guest_meeting_context || undefined,
    introduction: api.guest_introduction || undefined,
    intent: api.guest_intent || undefined,
    requestedAt: api.created_at,
  };
}

/** Pending requests addressed to the current user (awaiting accept/decline). */
export async function getIncomingRequests(): Promise<
  IncomingConnectionRequest[]
> {
  const { connections } = await fetchApiConnections();
  const list = Array.isArray(connections) ? connections : connections.data;
  return list
    .filter((c) => c.status === "pending" && c.direction === "received")
    .map(toRequest);
}

/** Connection requests the current user has sent that are still pending. */
export async function getSentRequests(): Promise<IncomingConnectionRequest[]> {
  const { connections } = await fetchApiConnections();
  const list = Array.isArray(connections) ? connections : connections.data;
  return list
    .filter((c) => c.status === "pending" && c.direction === "sent")
    .map(toRequest);
}

/** Established (approved) connections for the current user, both directions. */
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
    guest_introduction: data.introduction || undefined,
    guest_intent: data.intent || undefined,
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