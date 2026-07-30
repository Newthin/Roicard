/**
 * OrgAvatar
 *
 * Compact organization mark. Renders the org logo when a URL is provided,
 * otherwise falls back to the organization's initials on a branded tile.
 * Reused by the hero (small) and the Current Work card (medium).
 */

import { cn } from "@/lib/cn";
import { getInitials } from "@/lib/profile/helpers";

type OrgAvatarProps = {
  name: string;
  logoUrl?: string | null;
  size?: "sm" | "md";
  className?: string;
};

const SIZE_STYLES: Record<NonNullable<OrgAvatarProps["size"]>, string> = {
  sm: "h-5 w-5 rounded-md text-[9px]",
  md: "h-11 w-11 rounded-xl text-sm",
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
        "flex shrink-0 items-center justify-center font-bold uppercase",
        "bg-roicard-bg-muted text-roicard-accent ring-1 ring-roicard-border",
        SIZE_STYLES[size],
        className
      )}
    >
      {getInitials(name) || "•"}
    </span>
  );
}
