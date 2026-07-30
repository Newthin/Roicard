/**
 * VerificationBadge
 *
 * Small gradient check badge that overlaps the avatar to indicate a verified
 * (active) member. Purely presentational and reusable wherever a verified
 * marker is needed.
 */

import { cn } from "@/lib/cn";
import { Check } from "lucide-react";

type VerificationBadgeProps = {
  /** Diameter in pixels. */
  size?: number;
  className?: string;
  /** Accessible label; rendered visually hidden. */
  label?: string;
};

export function VerificationBadge({
  size = 28,
  className,
  label = "Verified member",
}: VerificationBadgeProps) {
  return (
    <span
      role="img"
      aria-label={label}
      style={{ width: size, height: size }}
      className={cn(
        "flex items-center justify-center rounded-full roicard-gradient",
        "border-[3px] border-roicard-bg-elevated shadow-md",
        className
      )}
    >
      <Check
        className="text-roicard-on-primary"
        style={{ width: size * 0.5, height: size * 0.5 }}
        strokeWidth={3}
        aria-hidden
      />
    </span>
  );
}
