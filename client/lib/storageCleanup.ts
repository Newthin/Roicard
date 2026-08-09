/**
 * Central owner of every browser-storage key tied to a single signed-in user.
 *
 * Any key here must be purged whenever the session changes (logout, new login,
 * token invalidated) so a previous account's cached data can never bleed into
 * the next account on the same device.
 */

export const AUTH_SESSION_KEYS = [
  "roicard_token",
  "roicard_user",
  "roicard_current_user",
  "roicard_profiles",
  "roicard_onboarding_complete",
  "roicard_payment_snapshot",
  "roicard_journey_state",
] as const;

/** Remove every per-user key from localStorage (SSR-safe, never throws). */
export function clearAllUserStorage(): void {
  if (typeof window === "undefined") return;
  for (const key of AUTH_SESSION_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore storage access errors (private mode / disabled storage).
    }
  }
}