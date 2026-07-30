/**
 * PublicProfileHeader
 *
 * Top navigation bar for the public profile: a back button, the centered
 * ROICARD wordmark, and a "more" menu offering copy-link and share actions.
 */

"use client";

import { BrandLogo } from "@/components/ui/BrandLogo";
import { cn } from "@/lib/cn";
import { ArrowLeft, Copy, MoreHorizontal, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type PublicProfileHeaderProps = {
  onShare: () => void;
  onCopyLink: () => void;
};

export function PublicProfileHeader({
  onShare,
  onCopyLink,
}: PublicProfileHeaderProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the menu on outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return;

    const handlePointer = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [menuOpen]);

  const runAction = (action: () => void) => {
    setMenuOpen(false);
    action();
  };

  const iconButton =
    "flex h-10 w-10 items-center justify-center rounded-full border border-roicard-border/70 bg-roicard-bg-elevated/70 text-roicard-text transition-colors hover:border-roicard-accent/50 hover:text-roicard-accent";

  return (
    <header className="sticky top-0 z-40 border-b border-roicard-border/60 header-surface backdrop-blur-xl theme-transition">
      <div className="mx-auto grid h-16 w-full max-w-[480px] grid-cols-[auto_1fr_auto] items-center gap-2 px-4 sm:px-6">
        <button
          type="button"
          onClick={() => router.back()}
          className={iconButton}
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </button>

        <div className="flex justify-center">
          <BrandLogo height={22} />
        </div>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className={iconButton}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="More options"
          >
            <MoreHorizontal className="h-5 w-5" aria-hidden />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className={cn(
                "absolute right-0 top-12 z-50 w-48 overflow-hidden rounded-2xl",
                "border border-roicard-border bg-roicard-bg-elevated shadow-xl"
              )}
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => runAction(onCopyLink)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-roicard-text transition-colors hover:bg-roicard-bg-muted"
              >
                <Copy className="h-4 w-4 text-roicard-accent" aria-hidden />
                Copy link
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => runAction(onShare)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-roicard-text transition-colors hover:bg-roicard-bg-muted"
              >
                <Share2 className="h-4 w-4 text-roicard-accent" aria-hidden />
                Share profile
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
