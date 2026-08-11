/**
 * Connection system type definitions.
 *
 * Shared across dashboard connections pages, public profile guest flow,
 * and future API integration.
 */

/** Direction of a connection row from the viewer's perspective. */
export type ConnectionDirection = "received" | "sent";

/** Person summary shown on connection and request cards. */
export type ConnectionPerson = {
  id: string;
  username?: string;
  firstName: string;
  lastName: string;
  profilePhotoUrl: string | null;
  professionalTitle: string;
  organization: string;
  email?: string;
  phone?: string;
  /** Set when the guest has a linked ROICARD account. */
  guestUserId?: string;
  /** Where the guest said they met the profile owner. */
  meetingContext?: string;
  /** Guest introduction — "tell them a little about yourself". */
  introduction?: string;
  /** Guest connection intent — why they are connecting. */
  intent?: string;
};

/** Incoming connection request awaiting accept/decline. */
export type IncomingConnectionRequest = {
  id: string;
  person: ConnectionPerson;
  requestedAt: string;
  /** Optional note about where the requester met the profile owner. */
  meetingContext?: string;
  introduction?: string;
  intent?: string;
};

/** Established connection between the user and another professional. */
export type Connection = {
  id: string;
  person: ConnectionPerson;
  connectedAt: string;
};

/** Sort options for the My Connections list. */
export type ConnectionSortOption = "most_recent" | "oldest" | "name_az";

/** Aggregate stats for dashboard summary cards. */
export type ConnectionSummary = {
  pendingCount: number;
  totalConnections: number;
  recentConnections: Connection[];
};