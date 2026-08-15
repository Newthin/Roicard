/**
 * InfoCard
 *
 * Generic titled card with a leading icon and a right-aligned chevron. Used for
 * "About Me" and designed to be reused for future sections (Skills, Education,
 * Certifications, etc.). When `collapsible` is set the header toggles the body.
 */

"use client";

import { ProfileCard } from "@/components/profile/public/ProfileCard";
import { cn } from "@/lib/cn";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { ReactNode, useId, useState } from "react";

type InfoCardProps = {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  /** When true, the header acts as a toggle that expands/collapses the body. */
  collapsible?: boolean;
  /** Initial open state for collapsible cards. */
  defaultOpen?: boolean;
};

export function InfoCard({
  icon: Icon,
  title,
  children,
  collapsible = false,
  defaultOpen = true,
}: InfoCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();

  const header = (
    <>
      <span className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-roicard-primary/10 text-roicard-accent">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <span className="text-sm font-semibold text-roicard-text">{title}</span>
      </span>
      <ChevronDown
        className={cn(
          "h-4 w-4 shrink-0 text-roicard-text-muted transition-transform duration-300",
          collapsible && !open && "-rotate-90"
        )}
        aria-hidden
      />
    </>
  );

  return (
    <ProfileCard>
      {collapsible ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={bodyId}
          className="flex w-full items-center justify-between gap-3 border-b border-roicard-border/60 px-5 py-4 text-left"
        >
          {header}
        </button>
      ) : (
        <div className="flex items-center justify-between gap-3 border-b border-roicard-border/60 px-5 py-4">
          {header}
        </div>
      )}

      {open && (
        <div
          id={bodyId}
          className="px-5 pb-5 pt-4 text-sm leading-relaxed text-roicard-text-muted whitespace-pre-line text-justify"
        >
          {children}
        </div>
      )}
    </ProfileCard>
  );
}
