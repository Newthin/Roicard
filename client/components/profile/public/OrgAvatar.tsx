/**
 * OrgAvatar
 *
 * Compact organization mark. Renders the org logo when a URL is provided,
 * otherwise shows a neutral building glyph — no initials. Reused by the
 * hero (small) and the Current Work card (medium).
 */

import { cn } from "@/lib/cn";
import { Building2 } from "lucide-react";

type OrgAvatarProps = {
  name: string;
  logoUrl?: string | null;
  size?: "sm" | "md";
  className?: string;
};

const SIZE_STYLES: Record<NonNullable<OrgAvatarProps["size"]>, string> = {
  sm: "h-5 w-5 rounded-md",
  md: "h-11 w-11 rounded-xl",
};

const ICON_STYLES: Record<NonNullable<OrgAvatarProps["size"]>, string> = {
  sm: "h-3 w-3",
  md: "h-5 w-5",
};

export function OrgAvatar({
  name,
  logoUrl,
  size = "sm",
  className,
}: OrgAvatarProps) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={`${name} logo`}
        className={cn("shrink-0 object-cover", SIZE_STYLES[size], className)}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center",
        "bg-roicard-bg-muted text-roicard-text-muted ring-1 ring-roicard-border",
        SIZE_STYLES[size],
        className
      )}
    >
      <Building2 className={cn("shrink-0", ICON_STYLES[size])} />
    </span>
  );
}
