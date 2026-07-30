/**
 * ShareProfileCard
 *
 * Collapsible "Share My Profile" card. The header row shows a QR glyph, title,
 * subtitle, a small QR thumbnail, and a chevron. Expanding reveals a large QR
 * code with copy-link and share actions.
 *
 * The QR is a decorative placeholder until a real QR library is integrated.
 */

"use client";

import { ProfileCard } from "@/components/profile/public/ProfileCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { getPublicProfileUrl } from "@/lib/profile/username";
import { Check, ChevronDown, Copy, QrCode, Share2 } from "lucide-react";
import { useCallback, useId, useState } from "react";

type ShareProfileCardProps = {
  username: string;
  onShare: () => void;
};

/** Fixed pseudo-random QR-style grid. Replace with a real QR when backend ready. */
const QR_PATTERN = [
  "1110011010110110",
  "1001101011001101",
  "1010110010110101",
  "1101001101001011",
  "1010110010110101",
  "1001101011001101",
  "1110011010110110",
  "1010110010110101",
];

function MockQr({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-8 gap-0.5 rounded-lg border-4 border-white bg-white p-2",
        className
      )}
      aria-hidden
    >
      {QR_PATTERN.flatMap((row, r) =>
        row
          .slice(0, 8)
          .split("")
          .map((cell, c) => (
            <div
              key={`${r}-${c}`}
              className={cn(
                "aspect-square rounded-[1px]",
                cell === "1" ? "bg-roicard-bg" : "bg-transparent"
              )}
            />
          ))
      )}
    </div>
  );
}

export function ShareProfileCard({ username, onShare }: ShareProfileCardProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const bodyId = useId();
  const profileUrl = getPublicProfileUrl(username);
  const displayUrl = profileUrl.replace(/^https?:\/\//, "");

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
    } catch {
      // Clipboard unavailable — still surface confirmation for the demo.
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [profileUrl]);

  return (
    <ProfileCard interactive>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={bodyId}
        className="flex w-full items-center gap-4 px-5 py-4 text-left"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-roicard-primary/10 text-roicard-accent">
          <QrCode className="h-5 w-5" aria-hidden />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-roicard-text">
            Share My Profile
          </span>
          <span className="block truncate text-xs text-roicard-text-muted">
            Scan or share my profile
          </span>
        </span>

        <MockQr className="h-11 w-11 shrink-0 p-1" />

        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-roicard-text-muted transition-transform duration-300",
            !open && "-rotate-90"
          )}
          aria-hidden
        />
      </button>

      {open && (
        <div
          id={bodyId}
          className="flex flex-col items-center gap-4 border-t border-roicard-border/60 px-5 py-6"
        >
          <MockQr className="h-44 w-44 p-3" />
          <p className="break-all text-center text-sm font-medium text-roicard-text">
            {displayUrl}
          </p>
          <div className="grid w-full grid-cols-2 gap-3">
            <Button
              variant="secondary"
              className="h-11 rounded-xl"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Link
                </>
              )}
            </Button>
            <Button className="h-11 rounded-xl" onClick={onShare}>
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </div>
        </div>
      )}
    </ProfileCard>
  );
}
