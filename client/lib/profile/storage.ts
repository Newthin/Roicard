import { getProfile, getPublicProfile, updateProfile as apiUpdateProfile } from "@/lib/api/profile";
import type {
  MembershipStatus,
  OnboardingFormData,
  UserProfile,
} from "@/lib/profile/types";
import { generateUsername } from "@/lib/profile/username";

const CURRENT_USER_KEY = "roicard_current_user";

function mapApiProfileToUserProfile(data: Record<string, unknown>): UserProfile {
  return {
    firstName: (data.user as Record<string, string>)?.first_name ?? "",
    lastName: (data.user as Record<string, string>)?.last_name ?? "",
    email: (data.user as Record<string, string>)?.email ?? "",
    profilePhotoUrl: (data as Record<string, string | null>)?.avatar_url ?? (data as Record<string, string | null>)?.avatar ?? null,
    professionalTitle: (data as Record<string, string | null>)?.title ?? "",
    roleDescription: (data as Record<string, string | null>)?.role_description ?? "",
    organization: (data as Record<string, string | null>)?.organisation ?? "",
    bio: (data as Record<string, string | null>)?.bio ?? "",
    phone: (data as Record<string, string | null>)?.phone ?? "",
    whatsapp: (data as Record<string, string | null>)?.whatsapp_phone ?? "",
    dateOfBirth: ((data as Record<string, string | null>)?.date_of_birth ?? "").slice(0, 10),
    gender:
      ((data as Record<string, string | null>)?.gender as "" | "male" | "female" | "prefer_not_to_say") ??
      "",
    location: (data as Record<string, string | null>)?.location ?? "",
    social: (() => {
      const links = (data as Record<string, unknown>)?.social_links;
      if (!Array.isArray(links)) {
        return {
          linkedin: "",
          instagram: "",
          twitter: "",
          facebook: "",
          tiktok: "",
          snapchat: "",
          website: "",
        };
      }
      const found: Record<string, string> = {};
      for (const link of links) {
        const row = link as { platform?: string; value?: string };
        if (row?.platform && typeof row.value === "string") {
          found[row.platform] = row.value;
        }
      }
      return {
        linkedin: found.linkedin ?? "",
        instagram: found.instagram ?? "",
        twitter: found.twitter ?? "",
        facebook: found.facebook ?? "",
        tiktok: found.tiktok ?? "",
        snapchat: found.snapchat ?? "",
        website: found.website ?? "",
      };
    })(),
    interests: Array.isArray((data as Record<string, unknown>)?.interests)
      ? ((data as Record<string, unknown>).interests as string[])
      : [],
    seeking: (data as Record<string, string | null>)?.seeking ?? "",
    offering: (data as Record<string, string | null>)?.offering ?? "",
    username: (data as Record<string, string | null>)?.slug ?? "",
    createdAt: (data as Record<string, string>)?.created_at ?? new Date().toISOString(),
    membershipStatus: "active",
  };
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  try {
    const res = await getProfile();
    return mapApiProfileToUserProfile(res.profile as unknown as Record<string, unknown>);
  } catch {
    return null;
  }
}

export async function getProfileByUsername(username: string): Promise<UserProfile | null> {
  try {
    const res = await getPublicProfile(username);
    return mapApiProfileToUserProfile(res as unknown as Record<string, unknown>);
  } catch {
    return null;
  }
}

export async function updateCurrentUserProfile(updates: Partial<UserProfile>): Promise<UserProfile | null> {
  try {
    const payload: Record<string, unknown> = {};
    if (updates.firstName !== undefined) payload.first_name = updates.firstName;
    if (updates.lastName !== undefined) payload.last_name = updates.lastName;
    if (updates.email !== undefined) payload.email = updates.email;
    if (updates.bio !== undefined) payload.bio = updates.bio;
    if (updates.phone !== undefined) payload.phone = updates.phone;
    if (updates.seeking !== undefined) payload.seeking = updates.seeking;
    if (updates.offering !== undefined) payload.offering = updates.offering;
    if (updates.location !== undefined) payload.location = updates.location;
    if (updates.professionalTitle !== undefined) payload.title = updates.professionalTitle;
    if (updates.roleDescription !== undefined) payload.role_description = updates.roleDescription;
    if (updates.organization !== undefined) payload.organisation = updates.organization;
    if (updates.whatsapp !== undefined) payload.whatsapp_phone = updates.whatsapp;
    if (updates.dateOfBirth !== undefined) payload.date_of_birth = updates.dateOfBirth;
    if (updates.gender !== undefined) payload.gender = updates.gender;
    if (updates.interests !== undefined) payload.interests = JSON.stringify(updates.interests);
    if (updates.social !== undefined) payload.social_links = JSON.stringify(updates.social);

    const res = await apiUpdateProfile(payload);
    return mapApiProfileToUserProfile(res.profile as unknown as Record<string, unknown>);
  } catch {
    return null;
  }
}

export function createAndSaveProfile(data: UserProfile): UserProfile {
  localStorage.setItem(CURRENT_USER_KEY, data.username);
  localStorage.setItem("roicard_onboarding_complete", "true");
  const raw = localStorage.getItem("roicard_profiles");
  const store = raw ? JSON.parse(raw) : {};
  store[data.username] = data;
  localStorage.setItem("roicard_profiles", JSON.stringify(store));
  return data;
}

export function setMembershipStatus(status: string): UserProfile | null {
  return null;
}

export function updateStoredProfilePhoto(url: string): void {
  const username = localStorage.getItem(CURRENT_USER_KEY);
  if (!username) return;
  const raw = localStorage.getItem("roicard_profiles");
  if (!raw) return;
  const store = JSON.parse(raw) as Record<string, UserProfile>;
  if (store[username]) {
    store[username].profilePhotoUrl = url;
    localStorage.setItem("roicard_profiles", JSON.stringify(store));
  }
  window.dispatchEvent(new CustomEvent("profile-photo-changed", { detail: url }));
}

export function setOnboardingComplete(): void {
  localStorage.setItem("roicard_onboarding_complete", "true");
}

export function isOnboardingComplete(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("roicard_onboarding_complete") === "true";
}

export function getCurrentUserProfileSync(): UserProfile | null {
  if (typeof window === "undefined") return null;
  const username = localStorage.getItem(CURRENT_USER_KEY);
  if (!username) return null;
  try {
    const raw = localStorage.getItem("roicard_profiles");
    if (!raw) return null;
    const store = JSON.parse(raw) as Record<string, UserProfile>;
    return store[username] ?? null;
  } catch {
    return null;
  }
}

export async function deleteCurrentUserProfile(): Promise<void> {
  localStorage.removeItem(CURRENT_USER_KEY);
  localStorage.removeItem("roicard_onboarding_complete");
}

const PAYMENT_SNAPSHOT_KEY = "roicard_payment_snapshot";

/** Persist the in-memory journey so it survives the Paystack redirect. */
export function savePaymentSnapshot(data: UserProfile): void {
  localStorage.setItem(PAYMENT_SNAPSHOT_KEY, JSON.stringify(data));
}

/** Retrieve a previously persisted payment journey snapshot. */
export function getPaymentSnapshot(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PAYMENT_SNAPSHOT_KEY);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

/** Clear the pending payment journey snapshot. */
export function clearPaymentSnapshot(): void {
  localStorage.removeItem(PAYMENT_SNAPSHOT_KEY);
}

const JOURNEY_STATE_KEY = "roicard_journey_state";

/** Persisted onboarding journey position + collected data (survives reload). */
export interface JourneyState {
  step: string;
  data: OnboardingFormData;
  membershipStatus: MembershipStatus;
}

/** Persist the onboarding journey position + data so a refresh/redirect resumes. */
export function saveJourneyState(state: JourneyState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(JOURNEY_STATE_KEY, JSON.stringify(state));
}

/** Retrieve a previously persisted onboarding journey state, if any. */
export function getJourneyState(): JourneyState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(JOURNEY_STATE_KEY);
    return raw ? (JSON.parse(raw) as JourneyState) : null;
  } catch {
    return null;
  }
}

/** Clear the persisted onboarding journey state. */
export function clearJourneyState(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(JOURNEY_STATE_KEY);
}
