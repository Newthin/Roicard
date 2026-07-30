/**
 * GradientActionButton
 *
 * Full-width primary CTA using the ROICARD brand gradient. Used for the
 * headline "Connect" action. Accepts an optional leading icon and forwards all
 * native button props so it stays fully reusable.
 */

"use client";

import { cn } from "@/lib/cn";
import { ButtonHTMLAttributes, ReactNode } from "react";

type GradientActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Optional icon rendered before the label. */
  icon?: ReactNode;
};

export function GradientActionButton({
  children,
  icon,
  className,
  ...props
}: GradientActionButtonProps) {
  return (
    <button
      className={cn(
        "group inline-flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl roicard-gradient",
        "text-base font-semibold text-roicard-on-primary",
        "shadow-lg shadow-roicard-primary/25 transition-all duration-300",
        "hover:-translate-y-0.5 hover:shadow-xl hover:shadow-roicard-primary/40 hover:brightness-[1.05]",
        "active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-roicard-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-roicard-bg",
        "disabled:pointer-events-none disabled:opacity-60",
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
