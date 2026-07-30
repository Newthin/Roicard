/**
 * BrandLogo
 *
 * Renders the ROICARD wordmark logo. Two theme variants are shipped (white text
 * for dark backgrounds, dark text for light backgrounds) and toggled purely via
 * CSS using the `data-theme` attribute on <html>, so there's no theme flash.
 *
 * The source artwork has a fixed aspect ratio (~6.24:1); width scales from the
 * provided height.
 */

import { cn } from "@/lib/cn";

/** Intrinsic aspect ratio of the logo artwork (width / height). */
const LOGO_ASPECT = 1298 / 208;

type BrandLogoProps = {
  /** Rendered logo height in pixels. Width scales automatically. */
  height?: number;
  /** Extra classes for the wrapper. */
  className?: string;
};

export function BrandLogo({ height = 28, className }: BrandLogoProps) {
  const width = Math.round(height * LOGO_ASPECT);

  return (
    <span
      className={cn("inline-flex items-center", className)}
      style={{ height }}
    >
      {/* Dark background variant (white wordmark) — default */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/logo-full-dark.png"
        alt="ROICARD"
        width={width}
        height={height}
        className="brand-logo brand-logo--dark h-full w-auto"
      />
      {/* Light background variant (dark wordmark) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/logo-full-light.png"
        alt="ROICARD"
        width={width}
        height={height}
        className="brand-logo brand-logo--light h-full w-auto"
      />
    </span>
  );
}
