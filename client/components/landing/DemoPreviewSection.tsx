/**
 * DemoPreviewSection
 *
 * "This Is What It Looks Like." live-preview block showcasing a demo identity
 * card alongside the marketing copy. The "See a Full Profile" link points at a
 * real public profile route (demo).
 */

import { DemoProfileCard } from "@/components/landing/DemoProfileCard";
import Link from "next/link";

export function DemoPreviewSection() {
  return (
    <section id="demo" className="border-t border-white/[0.08] px-8 py-[100px]">
      <div className="mx-auto grid max-w-[1180px] items-center gap-14 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <p className="mb-[26px] inline-flex items-center gap-[9px] font-display text-[12.5px] font-bold uppercase tracking-[0.1em] text-[#A8A29A]">
            <span className="inline-block h-[6px] w-[6px] rounded-full bg-[linear-gradient(120deg,#FF7A3D,#C0272D)]" />
            Live preview
          </p>
          <h2 className="font-display text-[34px] font-extrabold leading-[1.12] tracking-[-0.02em] text-[#F5F3F0] sm:text-[42px]">
            This Is What It Looks Like.
          </h2>
          <p className="mt-5 max-w-[460px] text-[18px] leading-[1.55] text-[#A8A29A]">
            A real profile. A real presence. This is Roicard, live.
          </p>

          <Link
            href="/alex-morgan"
            className="mt-8 inline-block text-[15px] font-bold text-[#FF7A3D] transition-colors hover:text-[#F5F3F0]"
          >
            See a Full Profile →
          </Link>
        </div>

        <DemoProfileCard
          profile={{
            initials: "SJ",
            name: "Sarah Johnson",
            role: "VP of Partnerships",
            organization: "Nexus Ventures",
            location: "New York, NY",
          }}
          className="w-full max-w-sm justify-self-center lg:justify-self-end"
        />
      </div>
    </section>
  );
}