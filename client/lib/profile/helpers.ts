/**
 * Profile display helpers.
 *
 * Shared utilities for formatting names, initials, and usernames
 * across public profile components.
 */

import type { UserProfile } from "@/lib/profile/types";

/** Returns the user's full display name from profile fields. */
export function getFullName(profile: Pick<UserProfile, "firstName" | "lastName">): string {
  return `${profile.firstName} ${profile.lastName}`.trim();
}

/** Generates 1–2 letter initials for avatar fallbacks. */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** Converts a URL slug username into a readable fallback display name. */
export function usernameToDisplayName(username: string): string {
  return username
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** Formats username with @ prefix for handles. */
export function formatHandle(username: string): string {
  return `@${username}`;
}

/** Deterministic mock stats from username for demo UI consistency. */
export function getMockProfileStats(username: string): {
  profileViews: number;
  connectionRequests: number;
  totalConnections: number;
} {
  const seed = username.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);

  return {
    profileViews: 120 + (seed % 380),
    connectionRequests: 8 + (seed % 42),
    totalConnections: 24 + (seed % 156),
  };
}
