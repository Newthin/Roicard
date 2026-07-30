/**
 * Theme type definitions.
 *
 * Central types for the global light/dark theme system.
 */

export type ThemeMode = "dark" | "light";

export type ThemeContextValue = {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  isReady: boolean;
};
