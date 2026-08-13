/**
 * DemoProfileCard
 *
 * Decorative profile-card mock used by the landing page hero and live-preview
 * sections. Uses initials avatars with a one-time verified badge so the
 * preview stays in sync with the premium marketing look while remaining a pure
 * visual showcase (no live profile data).
 */

import { cn } from "@/lib/cn";
import { Download, MessageCircle, UserPlus, Verified } from "lucide-react";

export type DemoProfile = {
  initials: string;
  name: string;
  role: string;
  organization: string;
  location: string;
};

type DemoProfileCardProps = {
  profile: DemoProfile;
  className?: string;
};

export function DemoProfileCard({
  profile,
  className,
}: DemoProfileCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-[22px] border border-white/[0.08] bg-[#16130F] p-8 text-center shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)]",
        className
      )}
    >
      <div className="relative mx-auto mb-[18px] inline-block">
        <div
          aria-hidden
          className="flex h-[92px] w-[92px] items-center justify-center rounded-full border-[3px] border-[#1B1613] bg-[linear-gradient(145deg,#2A211B,#1B1613)] font-display text-[30px] font-extrabold text-[#FF7A3D]"
        >
          {profile.initials}
        </div>
        <span
          aria-hidden
          className="absolute -right-0.5 bottom-0.5 flex h-[26px] w-[26px] items-center justify-center rounded-full border-[3px] border-[#16130F] bg-[linear-gradient(120deg,#FF7A3D,#C0272D)] text-white"
        >
          <Verified className="h-3.5 w-3.5" />
        </span>
      </div>

      <h3 className="font-display text-[22px] font-bold text-[#F5F3F0]">
        {profile.name}
      </h3>
      <p className="mb-[10px] text-[14.5px] font-semibold text-[#FF7A3D]">
        {profile.role}
      </p>
      <p className="mb-1 text-[13.5px] text-[#A8A29A]">{profile.organization}</p>
      <p className="mb-6 text-[13px] text-[#756F68]">
        📍 {profile.location}
      </p>

      <button
        type="button"
        className="mb-[10px] flex w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(120deg,#FF7A3D,#C0272D)] py-[13px] text-[15px] font-bold text-white transition-opacity hover:opacity-90"
      >
        <UserPlus className="h-4 w-4" aria-hidden />
        Connect
      </button>

      <div className="flex gap-[10px]">
        <button
          type="button"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#1B1613] px-2 py-[10px] text-[13px] font-semibold text-[#A8A29A] transition-colors hover:text-[#F5F3F0]"
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          Save Contact
        </button>
        <button
          type="button"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#1B1613] px-2 py-[10px] text-[13px] font-semibold text-[#A8A29A] transition-colors hover:text-[#F5F3F0]"
        >
          <MessageCircle className="h-3.5 w-3.5" aria-hidden />
          WhatsApp
        </button>
      </div>
    </div>
  );
}