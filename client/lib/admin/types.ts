/**
 * Admin module type definitions.
 *
 * Data models for user management, NFC assignments, and platform stats.
 */

export type UserStatus = "active" | "draft" | "suspended";

/** Platform user record for admin user management. */
export type AdminUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  status: UserStatus;
  joinedAt: string;
  profilePhotoUrl: string | null;
  professionalTitle: string;
  organization: string;
};

export type NFCStatus = "assigned" | "unassigned";

/** NFC card assignment record. */
export type NFCCard = {
  id: string;
  cardId: string;
  assignedUserId: string | null;
  assignedUserName: string | null;
  status: NFCStatus;
  assignedAt: string | null;
};

/** Platform-wide overview metrics. */
export type AdminOverviewMetrics = {
  totalUsers: number;
  totalConnections: number;
  totalNfcAssignments: number;
  totalProfileViews: number;
};

/** System activity event for admin overview feed. */
export type AdminActivityEvent = {
  id: string;
  type: "user_joined" | "nfc_assigned" | "user_suspended" | "connection_made";
  description: string;
  timestamp: string;
};

/** Platform statistics chart data point. */
export type AdminChartPoint = {
  label: string;
  value: number;
};

export type AdminDateRange = "7d" | "30d" | "90d" | "all";

export type AdminPlatformStats = {
  usersGrowth: AdminChartPoint[];
  connectionsGrowth: AdminChartPoint[];
  nfcUsage: AdminChartPoint[];
  profileViewTrends: AdminChartPoint[];
};
