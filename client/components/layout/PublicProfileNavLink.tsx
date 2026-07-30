/**
 * PublicProfileNavLink
 *
 * Sidebar navigation link to the user's public ROICARD profile (/username).
 * Falls back to onboarding prompt or demo profile when no username exists.
 *
 * Props:
 * - onNavigate: called when link is clicked (closes mobile drawer)
 */

"use client";

import { cn } from "@/lib/cn";
import { usePublicProfileUsername } from "@/hooks/usePublicProfileUsername";
import { ExternalLink, Globe } from "lucide-react";
import Link from "next/link";

type PublicProfileNavLinkProps = {
  onNavigate?: () => void;
};

export function PublicProfileNavLink({ onNavigate }: PublicProfileNavLinkProps) {
  const { username, isLoaded, publicPath } = usePublicProfileUsername();

  if (!isLoaded) return null;

  // User has completed onboarding — link to their live public profile
  if (publicPath && username) {
    return (
      <div className="mt-6 border-t border-roicard-border pt-4">
        <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-roicard-text-muted">
          Public
        </p>
        <Link
          href={publicPath}
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            "text-roicard-text-muted hover:bg-roicard-bg-muted hover:text-roicard-text",
            "border border-transparent hover:border-roicard-accent/20"
          )}
        >
          <Globe className="h-5 w-5 text-roicard-accent" />
          <span className="flex-1">My Public Card</span>
          <ExternalLink className="h-3.5 w-3.5 opacity-50" aria-hidden />
        </Link>
        <p className="mt-1.5 truncate px-3 text-xs text-roicard-text-muted/80">
          /{username}
        </p>
      </div>
    );
  }

  // No profile yet — guide user to onboarding or demo
  return (
    <div className="mt-6 border-t border-roicard-border pt-4">
      <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-roicard-text-muted">
        Public
      </p>
      <Link
        href="/onboarding"
        onClick={onNavigate}
        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-roicard-text-muted transition-colors hover:bg-roicard-bg-muted hover:text-roicard-text"
      >
        <Globe className="h-5 w-5 text-roicard-text-muted" />
        Set up public card
      </Link>
      <Link
        href="/peleg-darkey"
        onClick={onNavigate}
        className="mt-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-roicard-text-muted transition-colors hover:text-roicard-accent"
      >
        <span className="pl-8 text-xs">View demo →</span>
      </Link>
    </div>
  );
}
