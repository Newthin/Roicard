/**
 * Connection persistence (localStorage with API-backed owner).
 *
 * Stores incoming requests and established connections per user username.
 */

import type { ConnectionRequestData } from "@/lib/profile/types";
import type {
  Connection,
  ConnectionPerson,
  ConnectionSummary,
  IncomingConnectionRequest,
} from "@/lib/connections/types";
import { getCurrentUserProfile } from "@/lib/profile/storage";

const REQUESTS_KEY_PREFIX = "roicard_connection_requests_";
const CONNECTIONS_KEY_PREFIX = "roicard_connections_";

let cachedOwner: string | null = null;
let ownerPromise: Promise<string | null> | null = null;

async function resolveOwner(): Promise<string | null> {
  if (cachedOwner !== null) return cachedOwner;
  if (!ownerPromise) {
    ownerPromise = getCurrentUserProfile().then((p) => {
      cachedOwner = p?.username ?? null;
      return cachedOwner;
    });
  }
  return ownerPromise;
}

/** Synchronous getter — must wait for resolveOwner() to settle first. */
function getOwnerKey(): string | null {
  return cachedOwner;
}

/** Call once at app init or after login to hydrate the cache. */
export function hydrateOwner(): Promise<string | null> {
  return resolveOwner();
}

function requestsKey(owner: string): string {
  return `${REQUESTS_KEY_PREFIX}${owner}`;
}

function connectionsKey(owner: string): string {
  return `${CONNECTIONS_KEY_PREFIX}${owner}`;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

/** Seed demo requests and connections for first-time users. */
function getSeedRequests(): IncomingConnectionRequest[] {
  return [
    {
      id: "req-1",
      requestedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      person: {
        id: "p-req-1",
        username: "sarah-johnson",
        firstName: "Sarah",
        lastName: "Johnson",
        profilePhotoUrl: null,
        professionalTitle: "VP of Partnerships",
        organization: "Nexus Ventures",
        email: "sarah@nexusventures.com",
      },
    },
    {
      id: "req-2",
      requestedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      person: {
        id: "p-req-2",
        username: "john-doe",
        firstName: "John",
        lastName: "Doe",
        profilePhotoUrl: null,
        professionalTitle: "Software Engineer",
        organization: "TechFlow",
        email: "john@techflow.io",
      },
    },
  ];
}

function getSeedConnections(): Connection[] {
  return [
    {
      id: "conn-1",
      connectedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
      person: {
        id: "p-conn-1",
        username: "alex-morgan",
        firstName: "Alex",
        lastName: "Morgan",
        profilePhotoUrl: null,
        professionalTitle: "Product Designer",
        organization: "Acme Inc.",
        email: "alex@acme.com",
      },
    },
    {
      id: "conn-2",
      connectedAt: new Date(Date.now() - 21 * 86400000).toISOString(),
      person: {
        id: "p-conn-2",
        username: "peleg-darkey",
        firstName: "Peleg",
        lastName: "Darkey",
        profilePhotoUrl: null,
        professionalTitle: "Founder & CEO",
        organization: "ROICARD",
        email: "peleg@roicard.com",
      },
    },
    {
      id: "conn-3",
      connectedAt: new Date(Date.now() - 35 * 86400000).toISOString(),
      person: {
        id: "p-conn-3",
        firstName: "Maya",
        lastName: "Chen",
        profilePhotoUrl: null,
        professionalTitle: "Marketing Director",
        organization: "BrightPath",
        email: "maya@brightpath.com",
      },
    },
  ];
}

function ensureSeeded(owner: string): void {
  const reqKey = requestsKey(owner);
  const connKey = connectionsKey(owner);

  if (localStorage.getItem(reqKey) === null) {
    writeJson(reqKey, getSeedRequests());
  }
  if (localStorage.getItem(connKey) === null) {
    writeJson(connKey, getSeedConnections());
  }
}

/** Loads incoming requests for the current user. */
export function getIncomingRequests(): IncomingConnectionRequest[] {
  const owner = getOwnerKey();
  if (!owner) return [];

  ensureSeeded(owner);
  return readJson<IncomingConnectionRequest[]>(requestsKey(owner), []);
}

/** Loads established connections for the current user. */
export function getConnections(): Connection[] {
  const owner = getOwnerKey();
  if (!owner) return [];

  ensureSeeded(owner);
  return readJson<Connection[]>(connectionsKey(owner), []);
}

/** Accepts a request — moves person into connections, removes request. */
export function acceptRequest(requestId: string): void {
  const owner = getOwnerKey();
  if (!owner) return;

  const key = requestsKey(owner);
  const requests = readJson<IncomingConnectionRequest[]>(key, []);
  const request = requests.find((r) => r.id === requestId);
  if (!request) return;

  const remaining = requests.filter((r) => r.id !== requestId);
  writeJson(key, remaining);

  const connections = readJson<Connection[]>(connectionsKey(owner), []);
  connections.unshift({
    id: `conn-${Date.now()}`,
    person: request.person,
    connectedAt: new Date().toISOString(),
  });
  writeJson(connectionsKey(owner), connections);
}

/** Declines a request — removes it from the queue. */
export function declineRequest(requestId: string): void {
  const owner = getOwnerKey();
  if (!owner) return;

  const key = requestsKey(owner);
  const requests = readJson<IncomingConnectionRequest[]>(key, []);
  writeJson(
    key,
    requests.filter((r) => r.id !== requestId)
  );
}

/**
 * Guest public profile submit — adds request to target profile owner's inbox.
 * Uses target username from the public profile route.
 */
export function addGuestConnectionRequest(
  targetUsername: string,
  data: ConnectionRequestData
): void {
  const [firstName, ...rest] = data.name.trim().split(" ");
  const lastName = rest.join(" ") || "Guest";

  const person: ConnectionPerson = {
    id: `guest-${Date.now()}`,
    firstName,
    lastName,
    profilePhotoUrl: null,
    professionalTitle: "Professional",
    organization: data.organization || "Independent",
    email: data.email,
    phone: data.phone,
  };

  const key = requestsKey(targetUsername);
  ensureSeeded(targetUsername);

  const requests = readJson<IncomingConnectionRequest[]>(key, []);
  requests.unshift({
    id: `req-${Date.now()}`,
    person,
    requestedAt: new Date().toISOString(),
    meetingContext: data.meetingContext?.trim() || undefined,
  });
  writeJson(key, requests);
}

/** Summary stats for dashboard cards. */
export async function getConnectionSummary(): Promise<ConnectionSummary> {
  await resolveOwner();
  const requests = getIncomingRequests();
  const connections = getConnections();

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
