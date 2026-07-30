/**
 * AdminProvider
 *
 * Shared admin state for users and NFC cards across admin routes.
 * Fetches real data from backend API.
 */

"use client";

import type {
  AdminOverviewMetrics,
  AdminUser,
  NFCCard,
  UserStatus,
} from "@/lib/admin/types";
import {
  assignSmartCard,
  getAdminSmartCards,
  getAdminStats,
  getAdminUsers,
  unassignSmartCard,
  updateAdminUser,
} from "@/lib/api/admin";
import type { AdminUser as ApiAdminUser } from "@/lib/api/admin";
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type AdminContextValue = {
  users: AdminUser[];
  nfcCards: NFCCard[];
  overview: AdminOverviewMetrics;
  isLoading: boolean;
  refresh: () => void;
  updateUserStatus: (userId: string, status: UserStatus) => void;
  updateUser: (userId: string, updates: Partial<AdminUser>) => void;
  assignNfc: (nfcId: string, userId: string) => void;
  unassignNfc: (nfcId: string) => void;
  registerNfcCard: (
    cardId: string
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
};

const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}

function mapApiUser(u: ApiAdminUser): AdminUser {
  return {
    id: String(u.id),
    firstName: u.first_name,
    lastName: u.last_name,
    email: u.email,
    username: u.profile?.slug ?? "",
    status: (u.status === "active" || u.status === "draft" ? u.status : "suspended") as UserStatus,
    joinedAt: u.created_at,
    profilePhotoUrl: null,
    professionalTitle: u.profile?.title ?? "",
    organization: u.profile?.organisation ?? "",
  };
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [nfcCards, setNfcCards] = useState<NFCCard[]>([]);
  const [overview, setOverview] = useState<AdminOverviewMetrics>({
    totalUsers: 0,
    totalConnections: 0,
    totalNfcAssignments: 0,
    totalProfileViews: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);

    // Fire each request independently so one failure doesn't cascade to others
    await Promise.all([
      getAdminStats()
        .then((stats) =>
          setOverview({
            totalUsers: stats.total_users,
            totalConnections: stats.total_connections,
            totalNfcAssignments: stats.total_smart_cards,
            totalProfileViews: stats.recent_views_7d,
          })
        )
        .catch((e) => console.error("getAdminStats failed", e)),

      getAdminUsers()
        .then((res) => setUsers(res.data.map(mapApiUser)))
        .catch((e) => console.error("getAdminUsers failed", e)),

      getAdminSmartCards()
        .then((res) =>
          setNfcCards(
            res.data.map((c) => ({
              id: String(c.id),
              cardId: c.card_id,
              assignedUserId: c.user_id ? String(c.user_id) : null,
              assignedUserName: c.user
                ? `${c.user.first_name} ${c.user.last_name}`
                : null,
              status: (c.user_id ? "assigned" : "unassigned") as "assigned" | "unassigned",
              assignedAt: c.dispatched_at ?? c.created_at ?? null,
            }))
          )
        )
        .catch((e) => console.error("getAdminSmartCards failed", e)),
    ]);

    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateUserStatus = useCallback(
    async (userId: string, status: UserStatus) => {
      try {
        const apiStatus = status === "active" ? "active" : "draft";
        await updateAdminUser(Number(userId), { status: apiStatus });
        await refresh();
      } catch {
        // silently fail — user list stays unchanged
      }
    },
    [refresh]
  );

  const updateUser = useCallback(
    async (userId: string, updates: Partial<AdminUser>) => {
      const body: { status?: string; role?: string } = {};
      if (updates.status) body.status = updates.status === "active" ? "active" : "draft";
      if (Object.keys(body).length > 0) {
        try {
          await updateAdminUser(Number(userId), body);
          await refresh();
        } catch {
          // silently fail
        }
      }
    },
    [refresh]
  );

  const assignNfc = useCallback(
    async (nfcId: string, userId: string) => {
      try {
        await assignSmartCard(Number(nfcId), Number(userId));
        await refresh();
      } catch {
        // silently fail
      }
    },
    [refresh]
  );

  const unassignNfc = useCallback(
    async (nfcId: string) => {
      try {
        await unassignSmartCard(Number(nfcId));
        await refresh();
      } catch {
        // silently fail
      }
    },
    [refresh]
  );

  const registerNfcCard = useCallback(
    async (cardId: string): Promise<{ ok: true } | { ok: false; error: string }> => {
      return { ok: false, error: "Card registration via API is not yet implemented." };
    },
    []
  );

  const value = useMemo(
    () => ({
      users,
      nfcCards,
      overview,
      isLoading,
      refresh,
      updateUserStatus,
      updateUser,
      assignNfc,
      unassignNfc,
      registerNfcCard,
    }),
    [
      users,
      nfcCards,
      overview,
      isLoading,
      refresh,
      updateUserStatus,
      updateUser,
      assignNfc,
      unassignNfc,
      registerNfcCard,
    ]
  );

  return (
    <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
  );
}
