/**
 * Username generation utility for ROICARD profiles.
 *
 * Converts first + last name into a URL-safe public username
 * (e.g. "Alex Morgan" → "alex-morgan"). Used when onboarding completes.
 */

/**
 * Generates a URL-safe username from first and last name.
 *
 * @param firstName - User's first name from onboarding step 1
 * @param lastName - User's last name from onboarding step 1
 * @returns Lowercase hyphenated username for the public profile route
 */
export function generateUsername(firstName: string, lastName: string): string {
  const slug = [firstName, lastName]
    .map((part) =>
      part
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
    )
    .filter(Boolean)
    .join("-");

  return slug || "roicard-user";
}

/**
 * Builds the full public profile URL for a given username.
 * Used by QR code preview and share UI.
 */
export function getPublicProfileUrl(username: string): string {
  if (typeof window === "undefined") {
    return `/${username}`;
  }

  return `${window.location.origin}/${username}`;
}
