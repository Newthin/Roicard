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
  AdminUserDetail,
  NFCCard,
  UserStatus,
} from "@/lib/admin/types";
import {
  activateSmartCard,
  assignSmartCard,
  createAdminUser,
  deactivateSmartCard,
  deleteAdminUser,
  deleteAdminUserAvatar,
  getAdminSmartCards,
  getAdminStats,
  getAdminUser,
  getAdminUsers,
  registerSmartCard,
  sendAdminUserPasswordReset,
  unassignSmartCard,
  updateAdminUser,
  uploadAdminUserAvatar,
  updateAdminUserProfile,
} from "@/lib/api/admin";
import type {
  AdminUserProfilePayload,
  AdminUser as ApiAdminUser,
  AdminUserUpsertPayload,
} from "@/lib/api/admin";
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type MutationResult = { ok: true } | { ok: false; error: string };

export type AdminUserSaveInput = Partial<AdminUser> & {
  password?: string;
  password_confirmation?: string;
  /** Explicit opt-in for the once-only welcome email on admin completion. */
  sendWelcomeEmail?: boolean;
  /** Whether the profile save should mark onboarding complete (defaults true). */
  markOnboardingComplete?: boolean;
};

export type AdminRegisterInput = {
  first_name: string;
  last_name: string;
  email: string;
  username?: string;
  password: string;
  password_confirmation: string;
  status: "draft" | "active";
  role: "member" | "admin";
  campaign_code?: string;
  onboarding_completed?: boolean;
  email_verified?: boolean;
  account_access?: "active" | "suspended";
  send_welcome_email?: boolean;
};

type RegisterResult =
  | { ok: true; userId: string }
  | { ok: false; error: string };

type AdminContextValue = {
  users: AdminUser[];
  nfcCards: NFCCard[];
  overview: AdminOverviewMetrics;
  isLoading: boolean;
  refresh: () => void;
  updateUser: (
    userId: string,
    updates: AdminUserSaveInput
  ) => Promise<MutationResult>;
  deleteUser: (userId: string) => Promise<MutationResult>;
  registerUser: (data: AdminRegisterInput) => Promise<RegisterResult>;
  getUserDetail: (userId: string) => Promise<AdminUserDetail | null>;
  uploadAvatar: (userId: string, file: File) => Promise<MutationResult>;
  removeAvatar: (userId: string) => Promise<MutationResult>;
  sendPasswordReset: (userId: string) => Promise<MutationResult>;
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
    role: u.role === "admin" ? "admin" : "member",
    joinedAt: u.created_at,
    profilePhotoUrl: u.profile?.avatar_url || null,
    professionalTitle: u.profile?.title ?? "",
    organization: u.profile?.organisation ?? "",
    roleDescription: u.profile?.role_description ?? "",
    bio: u.profile?.bio ?? "",
    location: u.profile?.location ?? "",
    phone: u.profile?.phone ?? "",
    whatsapp: u.profile?.whatsapp_phone ?? "",
    seeking: u.profile?.seeking ?? "",
    offering: u.profile?.offering ?? "",
    dateOfBirth: u.profile?.date_of_birth?.slice(0, 10) ?? "",
    gender: u.profile?.gender ?? "",
    interests: u.profile?.interests ?? [],
    socialLinks: u.profile?.social_links ?? [],
    education: u.profile?.education ?? [],
    experience: u.profile?.experience ?? [],
    achievements: u.profile?.achievements ?? [],
    campaignCode: u.campaign_code ?? null,
    emailVerified: !!u.email_verified_at,
    onboardingCompleted: !!u.onboarding_completed,
    isDeactivated: !!u.is_deactivated,
    accessState: u.is_deactivated ? "suspended" : "active",
    profileCompletionPct: u.profile_completion_pct ?? u.profile?.completion_pct ?? 0,
    nextStep: u.next_step,
  };
}

function errorMessage(e: unknown, fallback: string): string {
  return e && typeof e === "object" && "response" in e
    ? String(
        (e as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? fallback
      )
    : fallback;
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

      getAdminUsers({ per_page: 100 })
        .then(async (res) => {
          // Fetch every page so the admin table sees all users, not just the
          // first 20. The client-side search/filter/pagination in UserTable
          // operates on this full set.
          const pages: AdminUser[] = res.data.map(mapApiUser);
          const lastPage = res.last_page ?? 1;
          const pageSize = res.per_page ?? 100;

          for (let page = 2; page <= lastPage; page++) {
            const next = await getAdminUsers({ page, per_page: pageSize });
            pages.push(...next.data.map(mapApiUser));
          }

          setUsers(pages);
        })
        .catch((e) => console.error("getAdminUsers failed", e)),

      getAdminSmartCards({ per_page: 100 })
        .then(async (res) => {
          const cards = res.data.map((c) => ({
            id: String(c.id),
            cardId: c.card_id,
            assignedUserId: c.user_id ? String(c.user_id) : null,
            assignedUserName: c.user
              ? `${c.user.first_name} ${c.user.last_name}`
              : null,
            status: (c.inventory_status ?? (c.user_id ? "assigned" : "available")) as NFCCard["status"],
            assignedAt: c.assigned_at ?? c.dispatched_at ?? c.created_at ?? null,
            publicProfileUrl: c.public_profile_url ?? null,
            publicProfileQrUrl: c.public_profile_qr_url ?? null,
          }));

          const lastPage = res.last_page ?? 1;
          const pageSize = res.per_page ?? 100;

          for (let page = 2; page <= lastPage; page++) {
            const next = await getAdminSmartCards({ page, per_page: pageSize });
            cards.push(
              ...next.data.map((c) => ({
                id: String(c.id),
                cardId: c.card_id,
                assignedUserId: c.user_id ? String(c.user_id) : null,
                assignedUserName: c.user
                  ? `${c.user.first_name} ${c.user.last_name}`
                  : null,
                status: (c.inventory_status ?? (c.user_id ? "assigned" : "available")) as NFCCard["status"],
                assignedAt: c.assigned_at ?? c.dispatched_at ?? c.created_at ?? null,
                publicProfileUrl: c.public_profile_url ?? null,
                publicProfileQrUrl: c.public_profile_qr_url ?? null,
              }))
            );
          }

          setNfcCards(cards);
        })
        .catch((e) => console.error("getAdminSmartCards failed", e)),
    ]);

    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateUser = useCallback(
    async (
      userId: string,
      updates: AdminUserSaveInput
    ): Promise<MutationResult> => {
      const accountBody: AdminUserUpsertPayload = {};

      if (updates.firstName !== undefined) accountBody.first_name = updates.firstName;
      if (updates.lastName !== undefined) accountBody.last_name = updates.lastName;
      if (updates.email !== undefined) accountBody.email = updates.email;
      if (updates.username !== undefined) accountBody.username = updates.username || null;
      if (updates.campaignCode !== undefined) {
        accountBody.campaign_code = updates.campaignCode ?? null;
      }
      if (updates.role !== undefined) accountBody.role = updates.role;
      if (updates.onboardingCompleted !== undefined) {
        accountBody.onboarding_completed = updates.onboardingCompleted;
      }
      if (updates.emailVerified !== undefined) {
        accountBody.email_verified = updates.emailVerified;
      }
      if (updates.accessState !== undefined) {
        accountBody.account_access = updates.accessState;
      }
      if (updates.password) {
        accountBody.password = updates.password;
        accountBody.password_confirmation = updates.password_confirmation ?? "";
      }
      // Membership state (payment/activation) is only changed when explicitly
      // supplied and never inferred from the access state.
      if (updates.status !== undefined && updates.status !== "suspended") {
        accountBody.status = updates.status === "active" ? "active" : "draft";
      }
      if (updates.sendWelcomeEmail) {
        accountBody.send_welcome_email = true;
      }

      // Profile fields go through the dedicated profile endpoint so admins
      // edit with the exact same validation/persistence as member settings.
      const profileBody: AdminUserProfilePayload = {};
      if (updates.firstName !== undefined) profileBody.first_name = updates.firstName;
      if (updates.lastName !== undefined) profileBody.last_name = updates.lastName;
      if (updates.professionalTitle !== undefined) profileBody.title = updates.professionalTitle;
      if (updates.organization !== undefined) profileBody.organisation = updates.organization;
      if (updates.roleDescription !== undefined) profileBody.role_description = updates.roleDescription;
      if (updates.bio !== undefined) profileBody.bio = updates.bio;
      if (updates.location !== undefined) profileBody.location = updates.location;
      if (updates.phone !== undefined) profileBody.phone = updates.phone;
      if (updates.whatsapp !== undefined) profileBody.whatsapp_phone = updates.whatsapp;
      if (updates.seeking !== undefined) profileBody.seeking = updates.seeking;
      if (updates.offering !== undefined) profileBody.offering = updates.offering;
      if (updates.dateOfBirth !== undefined) {
        profileBody.date_of_birth = updates.dateOfBirth || null;
      }
      if (updates.gender !== undefined) {
        profileBody.gender = updates.gender || null;
      }
      if (updates.interests !== undefined) {
        profileBody.interests = JSON.stringify(updates.interests);
      }
      if (updates.socialLinks !== undefined) {
        const links: Record<string, string> = {};
        for (const link of updates.socialLinks) {
          if (link.platform && link.value?.trim()) {
            links[link.platform] = link.value.trim();
          }
        }
        profileBody.social_links = JSON.stringify(links);
      }
      if (updates.education !== undefined) {
        profileBody.education = updates.education;
      }
      if (updates.experience !== undefined) {
        profileBody.experience = updates.experience;
      }
      if (updates.achievements !== undefined) {
        profileBody.achievements = updates.achievements;
      }
      if (updates.sendWelcomeEmail) {
        profileBody.send_welcome_email = true;
      }
      // Editing a member's profile is an explicit setup action: complete
      // onboarding unless the admin is deliberately leaving it open. Never
      // add this marker for access-only updates (e.g. suspending an account),
      // otherwise an unrelated change would silently finish onboarding.
      const hasProfileChanges = Object.keys(profileBody).length > 0;
      if (updates.markOnboardingComplete !== undefined) {
        profileBody.mark_onboarding_complete = updates.markOnboardingComplete;
      } else if (hasProfileChanges) {
        profileBody.mark_onboarding_complete = true;
      }

      try {
        if (Object.keys(accountBody).length > 0) {
          await updateAdminUser(Number(userId), accountBody);
        }
        if (Object.keys(profileBody).length > 0) {
          await updateAdminUserProfile(Number(userId), profileBody);
        }
        await refresh();
        return { ok: true };
      } catch (e) {
        return { ok: false, error: errorMessage(e, "Failed to update user") };
      }
    },
    [refresh]
  );

  const registerUser = useCallback(
    async (data: AdminRegisterInput): Promise<RegisterResult> => {
      try {
        const response = await createAdminUser(data);
        await refresh();
        return { ok: true, userId: String(response.user.id) };
      } catch (e) {
        return { ok: false, error: errorMessage(e, "Failed to create user") };
      }
    },
    [refresh]
  );

  const getUserDetail = useCallback(
    async (userId: string): Promise<AdminUserDetail | null> => {
      try {
        const response = await getAdminUser(Number(userId));
        const raw = response.data;
        const base = mapApiUser(raw);

        return {
          ...base,
          payments: (raw.payments ?? []).map((payment) => ({
            id: payment.id,
            amount: payment.amount,
            currency: payment.currency,
            method: payment.method,
            momoNumber: payment.momo_number,
            status: payment.status,
            provider: payment.provider,
            providerReference: payment.provider_reference,
            createdAt: payment.created_at,
          })),
          paymentSummary: raw.payment_summary
            ? {
                count: raw.payment_summary.count,
                successful: raw.payment_summary.successful,
                totalPaid: raw.payment_summary.total_paid,
                hasPaid: raw.payment_summary.has_paid,
              }
            : null,
        };
      } catch (e) {
        console.error("getAdminUser failed", e);
        return null;
      }
    },
    []
  );

  const uploadAvatar = useCallback(
    async (userId: string, file: File): Promise<MutationResult> => {
      try {
        await uploadAdminUserAvatar(Number(userId), file);
        await refresh();
        return { ok: true };
      } catch (e) {
        return { ok: false, error: errorMessage(e, "Failed to upload avatar") };
      }
    },
    [refresh]
  );

  const removeAvatar = useCallback(
    async (userId: string): Promise<MutationResult> => {
      try {
        await deleteAdminUserAvatar(Number(userId));
        await refresh();
        return { ok: true };
      } catch (e) {
        return { ok: false, error: errorMessage(e, "Failed to remove avatar") };
      }
    },
    [refresh]
  );

  const sendPasswordReset = useCallback(
    async (userId: string): Promise<MutationResult> => {
      try {
        await sendAdminUserPasswordReset(Number(userId));
        return { ok: true };
      } catch (e) {
        return { ok: false, error: errorMessage(e, "Failed to send password reset") };
      }
    },
    []
  );

  const deleteUser = useCallback(    async (userId: string): Promise<{ ok: true } | { ok: false; error: string }> => {
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
      updateUser,
      deleteUser,
      registerUser,
      getUserDetail,
      uploadAvatar,
      removeAvatar,
      sendPasswordReset,
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
      updateUser,
      deleteUser,
      registerUser,
      getUserDetail,
      uploadAvatar,
      removeAvatar,
      sendPasswordReset,
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
