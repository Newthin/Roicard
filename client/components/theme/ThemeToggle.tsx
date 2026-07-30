/**
 * ThemeToggle
 *
 * Global light/dark mode switch for navigation headers.
 * Uses sun/moon icons with accessible labels.
 */

"use client";

import { useTheme } from "@/components/theme/ThemeProvider";
import { cn } from "@/lib/cn";
import { Moon, Sun } from "lucide-react";

type ThemeToggleProps = {
  className?: string;
  /** Compact icon-only variant for tight headers */
  compact?: boolean;
};

export function ThemeToggle({ className, compact = false }: ThemeToggleProps) {
  const { theme, toggleTheme, isReady } = useTheme();
  const isDark = theme === "dark";

  if (!isReady) {
    return (
      <div
        className={cn("h-9 w-9 rounded-lg bg-roicard-bg-muted", className)}
        aria-hidden
      />
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg border border-roicard-border",
        "bg-roicard-bg-muted text-roicard-text-muted transition-all duration-300",
        "hover:border-roicard-accent/40 hover:bg-roicard-bg-elevated hover:text-roicard-text",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-roicard-accent/50",
        compact ? "h-9 w-9" : "h-9 px-3",
        className
      )}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-roicard-accent" aria-hidden />
      ) : (
        <Moon className="h-4 w-4 text-roicard-accent" aria-hidden />
      )}
      {!compact && (
        <span className="hidden text-xs font-medium sm:inline">
          {isDark ? "Light" : "Dark"}
        </span>
      )}
    </button>
  );
}
