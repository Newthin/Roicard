import { getProfile, getPublicProfile, updateProfile as apiUpdateProfile } from "@/lib/api/profile";
import type { UserProfile } from "@/lib/profile/types";
import { generateUsername } from "@/lib/profile/username";

const CURRENT_USER_KEY = "roicard_current_user";

function mapApiProfileToUserProfile(data: Record<string, unknown>): UserProfile {
  return {
    firstName: (data.user as Record<string, string>)?.first_name ?? "",
    lastName: (data.user as Record<string, string>)?.last_name ?? "",
    email: (data.user as Record<string, string>)?.email ?? "",
    profilePhotoUrl: (data as Record<string, string | null>)?.avatar ?? null,
    professionalTitle: (data as Record<string, string | null>)?.title ?? "",
    organization: (data as Record<string, string | null>)?.organisation ?? "",
    bio: (data as Record<string, string | null>)?.bio ?? "",
    phone: "",
    whatsapp: (data as Record<string, string | null>)?.whatsapp_phone ?? "",
    location: (data as Record<string, string | null>)?.location ?? "",
    social: {
      linkedin: "",
      instagram: "",
      twitter: "",
      facebook: "",
      tiktok: "",
      snapchat: "",
      website: "",
    },
    interests: [],
    seeking: "",
    offering: "",
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
    if (updates.firstName) payload.first_name = updates.firstName;
    if (updates.lastName) payload.last_name = updates.lastName;
    if (updates.email) payload.email = updates.email;
    if (updates.bio) payload.bio = updates.bio;
    if (updates.location) payload.location = updates.location;
    if (updates.professionalTitle) payload.title = updates.professionalTitle;
    if (updates.organization) payload.organisation = updates.organization;
    if (updates.whatsapp) payload.whatsapp_phone = updates.whatsapp;

    const res = await apiUpdateProfile(payload);
    return mapApiProfileToUserProfile(res.profile as unknown as Record<string, unknown>);
  } catch {
    return null;
  }
}

export function createAndSaveProfile(data: UserProfile): UserProfile {
  localStorage.setItem(CURRENT_USER_KEY, data.username);
  localStorage.setItem("roicard_onboarding_complete", "true");
  return data;
}

export function setMembershipStatus(status: string): UserProfile | null {
  return null;
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
