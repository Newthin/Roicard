/**
 * ProfileAmbientBackdrop
 *
 * Full-width chevron watermark + radial glow behind the profile hero area.
 * Used on the public profile page and the onboarding review step so the
 * pattern spans the header and fades naturally into the card stack below.
 */

import { cn } from "@/lib/cn";

type ProfileAmbientBackdropProps = {
  className?: string;
};

export function ProfileAmbientBackdrop({
  className,
}: ProfileAmbientBackdropProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 z-0 h-96 overflow-hidden sm:h-[26rem]",
        className
      )}
      aria-hidden
    >
      <div className="absolute inset-0 roicard-chevron-pattern opacity-[0.09]" />
      <div className="absolute inset-0 profile-ambient-glow" />
      {/* Bottom fade — pattern dissolves into the page background */}
      <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-b from-transparent via-roicard-bg/50 to-roicard-bg" />
    </div>
  );
}
