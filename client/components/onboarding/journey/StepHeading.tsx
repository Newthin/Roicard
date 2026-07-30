/**
 * StepHeading
 *
 * Consistent heading block for journey steps: a small accent eyebrow, a title,
 * and an optional description. Keeps typography uniform across all steps.
 */

"use client";

import { cn } from "@/lib/cn";
import { ReactNode } from "react";

type StepHeadingProps = {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  /** Center the heading (used for hero / informational steps). */
  centered?: boolean;
  className?: string;
};

export function StepHeading({
  eyebrow,
  title,
  description,
  centered = false,
  className,
}: StepHeadingProps) {
  return (
    <div className={cn(centered && "text-center", className)}>
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-roicard-accent">
          {eyebrow}
        </p>
      )}
      <h1 className="mt-2 text-2xl font-bold leading-tight text-roicard-text sm:text-3xl">
        {title}
      </h1>
      {description && (
        <p className="mt-3 text-sm leading-relaxed text-roicard-text-muted sm:text-base">
          {description}
        </p>
      )}
    </div>
  );
}
