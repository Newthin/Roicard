/**
 * Settings module type definitions.
 */

/** Settings tab identifiers for the tabbed interface. */
export type SettingsTab = "profile" | "account" | "security" | "danger";

/** Mock login session displayed in Security settings. */
export type LoginSession = {
  id: string;
  device: string;
  location: string;
  lastActive: string;
  current: boolean;
};

/** Security preferences stored in mock localStorage. */
export type SecurityPreferences = {
  twoFactorEnabled: boolean;
};
