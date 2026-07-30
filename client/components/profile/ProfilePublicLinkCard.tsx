/**
 * ProfilePublicLinkCard
 *
 * Displays the user's public ROICARD URL with copy and share actions.
 */

"use client";

import { Button } from "@/components/ui/Button";
import { getPublicProfileUrl } from "@/lib/profile/username";
import { Check, Copy, ExternalLink, Share2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type ProfilePublicLinkCardProps = {
  username: string;
};

export function ProfilePublicLinkCard({ username }: ProfilePublicLinkCardProps) {
  const publicUrl = getPublicProfileUrl(username);
  const displayPath = `/${username}`;
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback ignored for demo
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "My ROICARD",
          url: publicUrl,
        });
      } catch {
        // cancelled
      }
    } else {
      await handleCopy();
    }
  };

  return (
    <div className="rounded-xl border border-roicard-border bg-roicard-bg-elevated p-5 theme-transition">
      <p className="text-sm font-semibold text-roicard-text">Public profile link</p>
      <p className="mt-1 font-mono text-sm text-roicard-accent">{displayPath}</p>
      <p className="mt-1 break-all text-xs text-roicard-text-muted">{publicUrl}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          className="rounded-lg"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="h-4 w-4 text-emerald-400" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {copied ? "Copied" : "Copy link"}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="rounded-lg"
          onClick={handleShare}
        >
          <Share2 className="h-4 w-4" />
          Share
        </Button>
        <Link href={displayPath}>
          <Button variant="secondary" size="sm" className="rounded-lg">
            <ExternalLink className="h-4 w-4" />
            View live
          </Button>
        </Link>
      </div>
    </div>
  );
}
