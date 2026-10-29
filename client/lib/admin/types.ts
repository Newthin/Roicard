/**
 * Admin module type definitions.
 *
 * Data models for user management, NFC assignments, and platform stats.
 */

export type UserStatus = "active" | "draft" | "suspended";

import type {
  AdminAchievementEntry,
  AdminEducationEntry,
  AdminExperienceEntry,
  AdminSocialLink,
} from "@/lib/api/admin";

/** Platform user record for admin user management. */
export type AdminUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  status: UserStatus;
  role: "member" | "admin";
  joinedAt: string;
  profilePhotoUrl: string | null;
  professionalTitle: string;
  organization: string;
  roleDescription: string;
  bio: string;
  location: string;
  phone: string;
  whatsapp: string;
  dateOfBirth: string;
  gender: string;
  interests: string[];
  socialLinks: AdminSocialLink[];
  education: AdminEducationEntry[];
  experience: AdminExperienceEntry[];
  achievements: AdminAchievementEntry[];
  seeking: string;
  offering: string;
  campaignCode?: string | null;
  emailVerified: boolean;
  onboardingCompleted: boolean;
  isDeactivated: boolean;
  accessState: "active" | "suspended";
  profileCompletionPct: number;
  nextStep?: string;
};

export type AdminPayment = {
  id: number;
  amount: number;
  currency: string;
  method: string | null;
  momoNumber: string | null;
  status: string;
  provider: string;
  providerReference: string;
  createdAt: string | null;
};

export type AdminPaymentSummary = {
  count: number;
  successful: number;
  totalPaid: number;
  hasPaid: boolean;
};

export type AdminUserDetail = AdminUser & {
  payments: AdminPayment[];
  paymentSummary: AdminPaymentSummary | null;
};

export type NFCStatus =
  | "available"
  | "assigned"
  | "active"
  | "deactivated";

/** NFC card assignment record. */
export type NFCCard = {
  id: string;
  cardId: string;
  assignedUserId: string | null;
  assignedUserName: string | null;
  status: NFCStatus;
  assignedAt: string | null;
  /** Holder's live public profile URL — what gets programmed onto the card. */
  publicProfileUrl: string | null;
  /** Same-origin QR image of the public profile URL. */
  publicProfileQrUrl: string | null;
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
