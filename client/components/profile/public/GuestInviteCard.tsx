/**
 * GuestInviteCard
 *
 * A gentle invitation shown at the bottom of a public profile encouraging the
 * viewing guest to create their own ROICARD. Reuses the shared ProfileCard
 * shell and links to the registration flow.
 *
 * Props:
 * - name: profile owner's first name, used to personalize the invite
 */

import { ProfileCard } from "@/components/profile/public/ProfileCard";
import { Sparkles } from "lucide-react";
import Link from "next/link";

type GuestInviteCardProps = {
  name: string;
};

export function GuestInviteCard({ name }: GuestInviteCardProps) {
  return (
    <ProfileCard interactive className="relative overflow-hidden">
      {/* Subtle brand watermark */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06] roicard-chevron-pattern"
        aria-hidden
      />

      <div className="relative flex items-center gap-3 px-4 py-3.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl roicard-gradient text-roicard-on-primary shadow-sm">
          <Sparkles className="h-4 w-4" aria-hidden />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-roicard-text">
            Join {name} on ROICARD
          </p>
          <p className="truncate text-xs text-roicard-text-muted">
            Create your own profile.
          </p>
        </div>

        <Link
          href="/auth/register"
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-xl roicard-gradient px-4 text-xs font-semibold text-roicard-on-primary transition-all duration-300 hover:brightness-[1.05] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-roicard-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-roicard-bg"
        >
          Create
        </Link>
      </div>
    </ProfileCard>
  );
}
