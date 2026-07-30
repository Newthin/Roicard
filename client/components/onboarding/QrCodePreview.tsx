/**
 * QR code preview UI for ROICARD public profiles.
 *
 * Frontend-only placeholder that visualizes where a scannable QR code will
 * appear once backend generation is integrated. Shows the profile URL below.
 */

"use client";

import { getPublicProfileUrl } from "@/lib/profile/username";
import { cn } from "@/lib/cn";
import { QrCode } from "lucide-react";

type QrCodePreviewProps = {
  /** Public username used to build the profile URL */
  username: string;
  /** Optional size variant */
  size?: "sm" | "md";
  className?: string;
};

/**
 * Renders a decorative QR-style grid pattern.
 * Replace with a real QR library (e.g. qrcode.react) when backend is ready.
 */
function MockQrPattern() {
  // Fixed pseudo-random pattern for consistent visual
  const pattern = [
    "1110011010110110",
    "1001101011001101",
    "1010110010110101",
    "1101001101001011",
    "1010110010110101",
    "1001101011001101",
    "1110011010110110",
    "1010110010110101",
  ];

  return (
    <div className="grid grid-cols-8 gap-0.5 p-3">
      {pattern.flatMap((row, rowIndex) =>
        row.split("").map((cell, colIndex) => (
          <div
            key={`${rowIndex}-${colIndex}`}
            className={cn(
              "aspect-square rounded-[2px]",
              cell === "1" ? "bg-roicard-bg" : "bg-transparent"
            )}
          />
        ))
      )}
    </div>
  );
}

export function QrCodePreview({
  username,
  size = "md",
  className,
}: QrCodePreviewProps) {
  const profileUrl = getPublicProfileUrl(username);
  const displayUrl = profileUrl.replace(/^https?:\/\//, "");

  return (
    <div
      className={cn(
        "rounded-xl border border-roicard-border bg-roicard-bg-muted/50 p-4 text-center",
        className
      )}
    >
      <div className="mb-3 flex items-center justify-center gap-2 text-sm font-medium text-roicard-text">
        <QrCode className="h-4 w-4 text-roicard-accent" />
        Your QR Code
      </div>

      <div
        className={cn(
          "mx-auto inline-block overflow-hidden rounded-lg border-4 border-white bg-white",
          size === "sm" ? "scale-75" : "scale-100"
        )}
      >
        <MockQrPattern />
      </div>

      <p className="mt-3 break-all text-xs text-roicard-text-muted">
        {displayUrl}
      </p>

      <p className="mt-1 text-[10px] uppercase tracking-wider text-roicard-text-muted/70">
        Scan to view profile
      </p>
    </div>
  );
}
