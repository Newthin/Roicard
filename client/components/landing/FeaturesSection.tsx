/**
 * FeaturesSection
 *
 * "One Identity. Every Opportunity." grid of ROICARD capabilities in the warm
 * marketing palette. Uses FeatureCard for each entry.
 */

import { FeatureCard } from "@/components/landing/FeatureCard";
import type { FeatureCardProps } from "@/components/landing/FeatureCard";
import {
  ArrowUpRight,
  Check,
  Gem,
  LayoutGrid,
  Radar,
  Zap,
} from "lucide-react";

const FEATURES: (Omit<FeatureCardProps, "icon"> & {
  icon: FeatureCardProps["icon"];
})[] = [
  {
    icon: Zap,
    title: "One Tap. Instantly Shared.",
    description:
      "Your identity, shared through your Smart Card, QR code, or profile link. No app. No fumbling for a card that gets lost.",
  },
  {
    icon: Gem,
    title: "This Isn't a Card. It's an Identity.",
    description:
      "The infrastructure behind every connection you make — built to last past the first hello.",
    highlight: true,
  },
  {
    icon: Radar,
    title: "A Network Built for Opportunity.",
    description:
      "Professionals, students, founders, mentors — the people and opportunities that move you forward.",
  },
  {
    icon: LayoutGrid,
    title: "Who You Are. In One Place.",
    description:
      "A professional profile that shows what you do, and the opportunities you seek and offer.",
  },
  {
    icon: ArrowUpRight,
    title: "Say What You Need.",
    description:
      "The opportunities you're seeking. The value you offer. Every connection, intentional from the start.",
  },
  {
    icon: Check,
    title: "Trust, Built In.",
    description:
      "Your achievements and experience, presented credibly. Trust before the first word.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="border-t border-white/[0.08] px-8 py-[100px]">
      <div className="mx-auto max-w-[1180px]">
        <div className="mx-auto mb-14 max-w-[640px] text-center">
          <p className="mb-7 inline-flex items-center gap-2 rounded-full border border-[rgba(255,122,61,0.4)] bg-[rgba(255,122,61,0.08)] px-[14px] py-[7px] font-display text-[12.5px] font-bold uppercase tracking-[0.08em] text-[#FF7A3D]">
            Identity
          </p>
          <h2 className="font-display text-[32px] font-extrabold tracking-[-0.02em] text-[#F5F3F0] sm:text-[40px]">
            One Identity. Every Opportunity.
          </h2>
          <p className="mt-4 text-[17px] text-[#A8A29A]">
            Roicard isn&apos;t a card you carry. It&apos;s an identity that
            carries you.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <FeatureCard
              key={feature.title}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              highlight={feature.highlight}
            />
          ))}
        </div>
      </div>
    </section>
  );
}