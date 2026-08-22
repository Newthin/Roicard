/**
 * Admin mock data — seed users, NFC cards, activity, and statistics.
 */

import type {
  AdminActivityEvent,
  AdminChartPoint,
  AdminDateRange,
  AdminOverviewMetrics,
  AdminPlatformStats,
  AdminUser,
  NFCCard,
} from "@/lib/admin/types";

const STORAGE_USERS_KEY = "roicard_admin_users";
const STORAGE_NFC_KEY = "roicard_admin_nfc";

function seedUsers(): AdminUser[] {
  return [
    {
      id: "u1",
      firstName: "Alex",
      lastName: "Morgan",
      email: "alex@acme.com",
      username: "alex-morgan",
      status: "active",
      joinedAt: "2025-01-15T10:00:00.000Z",
      profilePhotoUrl: null,
      professionalTitle: "Product Designer",
      organization: "Acme Inc.",
      roleDescription: "",
      bio: "",
      location: "",
      phone: "",
      whatsapp: "",
      seeking: "",
      offering: "",
    },
    {
      id: "u2",
      firstName: "Sarah",
      lastName: "Johnson",
      email: "sarah@nexusventures.com",
      username: "sarah-johnson",
      status: "active",
      joinedAt: "2025-02-01T14:30:00.000Z",
      profilePhotoUrl: null,
      professionalTitle: "VP of Partnerships",
      organization: "Nexus Ventures",
      roleDescription: "",
      bio: "",
      location: "",
      phone: "",
      whatsapp: "",
      seeking: "",
      offering: "",
    },
    {
      id: "u3",
      firstName: "John",
      lastName: "Doe",
      email: "john@techflow.io",
      username: "john-doe",
      status: "active",
      joinedAt: "2025-03-10T09:00:00.000Z",
      profilePhotoUrl: null,
      professionalTitle: "Software Engineer",
      organization: "TechFlow",
      roleDescription: "",
      bio: "",
      location: "",
      phone: "",
      whatsapp: "",
      seeking: "",
      offering: "",
    },
    {
      id: "u4",
      firstName: "Peleg",
      lastName: "Darkey",
      email: "peleg@roicard.com",
      username: "peleg-darkey",
      status: "active",
      joinedAt: "2025-01-01T00:00:00.000Z",
      profilePhotoUrl: null,
      professionalTitle: "Founder & CEO",
      organization: "ROICARD",
      roleDescription: "",
      bio: "",
      location: "",
      phone: "",
      whatsapp: "",
      seeking: "",
      offering: "",
    },
    {
      id: "u5",
      firstName: "Maya",
      lastName: "Chen",
      email: "maya@brightpath.com",
      username: "maya-chen",
      status: "suspended",
      joinedAt: "2024-11-20T08:00:00.000Z",
      profilePhotoUrl: null,
      professionalTitle: "Marketing Director",
      organization: "BrightPath",
      roleDescription: "",
      bio: "",
      location: "",
      phone: "",
      whatsapp: "",
      seeking: "",
      offering: "",
    },
    {
      id: "u6",
      firstName: "James",
      lastName: "Wilson",
      email: "james@startup.io",
      username: "james-wilson",
      status: "active",
      joinedAt: "2025-04-05T16:00:00.000Z",
      profilePhotoUrl: null,
      professionalTitle: "Founder",
      organization: "Startup.io",
      roleDescription: "",
      bio: "",
      location: "",
      phone: "",
      whatsapp: "",
      seeking: "",
      offering: "",
    },
  ];
}

function seedNfcCards(): NFCCard[] {
  return [
    {
      id: "nfc1",
      cardId: "NFC-ROIC-001",
      assignedUserId: "u1",
      assignedUserName: "Alex Morgan",
      status: "assigned",
      assignedAt: "2025-02-10T10:00:00.000Z",
      publicProfileUrl: null,
      publicProfileQrUrl: null,
    },
    {
      id: "nfc2",
      cardId: "NFC-ROIC-002",
      assignedUserId: "u4",
      assignedUserName: "Peleg Darkey",
      status: "assigned",
      assignedAt: "2025-01-05T12:00:00.000Z",
      publicProfileUrl: null,
      publicProfileQrUrl: null,
    },
    {
      id: "nfc3",
      cardId: "NFC-ROIC-003",
      assignedUserId: null,
      assignedUserName: null,
      status: "available",
      assignedAt: null,
      publicProfileUrl: null,
      publicProfileQrUrl: null,
    },
    {
      id: "nfc4",
      cardId: "NFC-ROIC-004",
      assignedUserId: "u2",
      assignedUserName: "Sarah Johnson",
      status: "assigned",
      assignedAt: "2025-03-01T09:00:00.000Z",
      publicProfileUrl: null,
      publicProfileQrUrl: null,
    },
    {
      id: "nfc5",
      cardId: "NFC-ROIC-005",
      assignedUserId: null,
      assignedUserName: null,
      status: "available",
      assignedAt: null,
      publicProfileUrl: null,
      publicProfileQrUrl: null,
    },
  ];
}

function readOrSeed<T>(key: string, seed: () => T): T {
  if (typeof window === "undefined") return seed();

  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    // fall through to seed
  }

  const data = seed();
  localStorage.setItem(key, JSON.stringify(data));
  return data;
}

export function getAdminUsers(): AdminUser[] {
  return readOrSeed(STORAGE_USERS_KEY, seedUsers);
}

export function saveAdminUsers(users: AdminUser[]): void {
  localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
}

export function getAdminNfcCards(): NFCCard[] {
  return readOrSeed(STORAGE_NFC_KEY, seedNfcCards);
}

export function saveAdminNfcCards(cards: NFCCard[]): void {
  localStorage.setItem(STORAGE_NFC_KEY, JSON.stringify(cards));
}

export function getAdminOverviewMetrics(): AdminOverviewMetrics {
  const users = getAdminUsers();
  const nfc = getAdminNfcCards();

  return {
    totalUsers: users.length,
    totalConnections: 248,
    totalNfcAssignments: nfc.filter((c) => c.status === "assigned").length,
    totalProfileViews: 12480,
  };
}

export function getAdminActivityFeed(): AdminActivityEvent[] {
  return [
    {
      id: "a1",
      type: "user_joined",
      description: "James Wilson joined the platform",
      timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
    },
    {
      id: "a2",
      type: "nfc_assigned",
      description: "NFC-ROIC-004 assigned to Sarah Johnson",
      timestamp: new Date(Date.now() - 8 * 3600000).toISOString(),
    },
    {
      id: "a3",
      type: "connection_made",
      description: "42 new connections created today",
      timestamp: new Date(Date.now() - 24 * 3600000).toISOString(),
    },
    {
      id: "a4",
      type: "user_suspended",
      description: "Maya Chen account suspended",
      timestamp: new Date(Date.now() - 48 * 3600000).toISOString(),
    },
  ];
}

function buildChartSeries(
  range: AdminDateRange,
  base: number
): AdminChartPoint[] {
  const points =
    range === "7d" ? 7 : range === "30d" ? 10 : range === "90d" ? 12 : 12;

  return Array.from({ length: points }, (_, i) => ({
    label: `P${i + 1}`,
    value: Math.round(base + i * (range === "7d" ? 3 : 8) + (i % 3) * 5),
  }));
}

/** Platform-wide statistics for admin charts — scales with date filter. */
export function getAdminPlatformStats(range: AdminDateRange): AdminPlatformStats {
  const mult =
    range === "7d" ? 1 : range === "30d" ? 2.5 : range === "90d" ? 5 : 10;

  return {
    usersGrowth: buildChartSeries(range, 10 * mult),
    connectionsGrowth: buildChartSeries(range, 25 * mult),
    nfcUsage: [
      { label: "Assigned", value: Math.round(18 * mult) },
      { label: "available", value: Math.round(7 * mult) },
      { label: "Inactive", value: Math.round(3 * mult) },
    ],
    profileViewTrends: buildChartSeries(range, 120 * mult),
  };
}
