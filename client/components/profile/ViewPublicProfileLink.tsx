/**
 * ViewPublicProfileLink
 *
 * Shows a link to the logged-in user's public profile (/username).
 * Reads username from mock localStorage after onboarding.
 */

"use client";

import { Button } from "@/components/ui/Button";
import { usePublicProfileUsername } from "@/hooks/usePublicProfileUsername";
import { ExternalLink } from "lucide-react";
import Link from "next/link";

export function ViewPublicProfileLink() {
  const { username, isLoaded, publicPath } = usePublicProfileUsername();

  if (!isLoaded) return null;

  if (!publicPath || !username) {
    return (
      <p className="text-sm text-roicard-text-muted">
        Complete{" "}
        <Link
          href="/onboarding"
          className="font-medium text-roicard-accent hover:text-roicard-text"
        >
          onboarding
        </Link>{" "}
        to get your public profile link. Or try a demo:{" "}
        <Link
          href="/peleg-darkey"
          className="font-medium text-roicard-accent hover:text-roicard-text"
        >
          /peleg-darkey
        </Link>
      </p>
    );
  }

  const publicUrl = publicPath;

  return (
    <div className="rounded-xl border border-roicard-border bg-roicard-bg-muted/40 p-4">
      <p className="text-sm text-roicard-text-muted">Your public profile</p>
      <p className="mt-1 font-mono text-sm font-medium text-roicard-accent">
        {publicUrl}
      </p>
      <Link href={publicUrl} className="mt-4 inline-block">
        <Button variant="secondary" size="sm" className="rounded-lg">
          <ExternalLink className="h-4 w-4" />
          View public profile
        </Button>
      </Link>
    </div>
  );
}
