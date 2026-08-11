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
  activateSmartCard,
  assignSmartCard,
  createAdminUser,
  deactivateSmartCard,
  deleteAdminUser,
  getAdminSmartCards,
  getAdminStats,
  getAdminUsers,
  registerSmartCard,
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
  deleteUser: (userId: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  registerUser: (data: {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    password_confirmation: string;
    status: "draft" | "active";
    role: "member" | "admin";
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
  assignNfc: (nfcId: string, userId: string) => void;
  unassignNfc: (nfcId: string) => void;
  activateNfc: (nfcId: string) => void;
  deactivateNfc: (nfcId: string) => void;
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
    profilePhotoUrl: u.profile?.avatar_url || null,
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
              status: (c.inventory_status ?? (c.user_id ? "assigned" : "available")) as NFCCard["status"],
              assignedAt: c.assigned_at ?? c.dispatched_at ?? c.created_at ?? null,
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

  const registerUser = useCallback(    async (data: {
      first_name: string;
      last_name: string;
      email: string;
      password: string;
      password_confirmation: string;
      status: "draft" | "active";
      role: "member" | "admin";
    }): Promise<{ ok: true } | { ok: false; error: string }> => {
      try {
        await createAdminUser(data);
        await refresh();
        return { ok: true };
      } catch (e) {
        const msg =
          e && typeof e === "object" && "response" in e
            ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? "Failed to create user")
            : "Failed to create user";
        return { ok: false, error: msg };
      }
    },
    [refresh]
  );

  const deleteUser = useCallback(
    async (userId: string): Promise<{ ok: true } | { ok: false; error: string }> => {
      try {
        await deleteAdminUser(Number(userId));
        await refresh();
        return { ok: true };
      } catch (e) {
        const msg =
          e && typeof e === "object" && "response" in e
            ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? "Failed to delete user")
            : "Failed to delete user";
        return { ok: false, error: msg };
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

  const activateNfc = useCallback(
    async (nfcId: string) => {
      try {
        await activateSmartCard(Number(nfcId));
        await refresh();
      } catch {
        // silently fail
      }
    },
    [refresh]
  );

  const deactivateNfc = useCallback(
    async (nfcId: string) => {
      try {
        await deactivateSmartCard(Number(nfcId));
        await refresh();
      } catch {
        // silently fail
      }
    },
    [refresh]
  );

  const registerNfcCard = useCallback(
    async (cardId: string): Promise<{ ok: true } | { ok: false; error: string }> => {
      try {
        await registerSmartCard({ card_id: cardId });
        await refresh();
        return { ok: true };
      } catch (e) {
        const msg =
          e && typeof e === "object" && "response" in e
            ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? "Failed to register card")
            : "Failed to register card";
        return { ok: false, error: msg };
      }
    },
    [refresh]
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
      deleteUser,
      registerUser,
      assignNfc,
      unassignNfc,
      activateNfc,
      deactivateNfc,
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
      deleteUser,
      registerUser,
      assignNfc,
      unassignNfc,
      activateNfc,
      deactivateNfc,
      registerNfcCard,
    ]
  );

  return (
    <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
  );
}
