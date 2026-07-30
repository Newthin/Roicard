/**
 * Settings mock persistence.
 *
 * Stores security preferences and session info for frontend development.
 */

import type { LoginSession, SecurityPreferences } from "@/lib/settings/types";

const SECURITY_KEY = "roicard_security_prefs";

const DEFAULT_SECURITY: SecurityPreferences = {
  twoFactorEnabled: false,
};

/** Mock active login sessions for Security settings UI. */
export function getMockLoginSessions(): LoginSession[] {
  return [
    {
      id: "session-1",
      device: "Chrome on Linux",
      location: "Tel Aviv, Israel",
      lastActive: "Active now",
      current: true,
    },
    {
      id: "session-2",
      device: "Safari on iPhone",
      location: "Tel Aviv, Israel",
      lastActive: "2 days ago",
      current: false,
    },
  ];
}

export function getSecurityPreferences(): SecurityPreferences {
  if (typeof window === "undefined") return DEFAULT_SECURITY;

  try {
    const raw = localStorage.getItem(SECURITY_KEY);
    return raw ? (JSON.parse(raw) as SecurityPreferences) : DEFAULT_SECURITY;
  } catch {
    return DEFAULT_SECURITY;
  }
}

export function saveSecurityPreferences(prefs: SecurityPreferences): void {
  localStorage.setItem(SECURITY_KEY, JSON.stringify(prefs));
}
