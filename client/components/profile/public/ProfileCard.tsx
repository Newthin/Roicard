/**
 * ProfileCard
 *
 * Shared rounded glass card shell used by every public profile section.
 * Centralizes radius, border, background, shadow, and hover behavior so the
 * page has a single source of truth for card styling (no duplicated styles).
 */

"use client";

import { cn } from "@/lib/cn";
import { ReactNode } from "react";

type ProfileCardProps = {
  children: ReactNode;
  className?: string;
  /** Adds a subtle hover lift + accent border for tappable cards. */
  interactive?: boolean;
};

export function ProfileCard({
  children,
  className,
  interactive = false,
}: ProfileCardProps) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-roicard-border/70 bg-roicard-bg-elevated/80 backdrop-blur-sm",
        "shadow-[0_10px_30px_-12px_var(--rc-shadow)] theme-transition",
        interactive &&
          "transition-all duration-300 hover:-translate-y-0.5 hover:border-roicard-accent/40 hover:shadow-[0_16px_40px_-12px_var(--rc-shadow)]",
        className
      )}
    >
      {children}
    </div>
  );
}
