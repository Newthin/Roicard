/**
 * FeaturesSection
 *
 * Grid of ROICARD product capabilities using FeatureCard components.
 * Highlights core value props: identity, sharing, connections, analytics.
 */

import { FeatureCard } from "@/components/landing/FeatureCard";
import {
  BadgeCheck,
  Link2,
  QrCode,
  Shield,
  UserCircle,
  Users,
} from "lucide-react";

const FEATURES = [
  {
    icon: QrCode,
    title: "One Tap. Instantly Shared.",
    description:
      "Your identity, shared through your Smart Card, QR code, or profile link. No app. No fumbling for a card that gets lost.",
  },
  {
    icon: Shield,
    title: "This Isn't a Card. It's an Identity.",
    description:
      "The infrastructure behind every connection you make — built to last past the first hello.",
  },
  {
    icon: Users,
    title: "A Network Built for Opportunity.",
    description:
      "Professionals, students, founders, mentors — the people and opportunities that move you forward.",
  },
  {
    icon: UserCircle,
    title: "Who You Are. In One Place.",
    description:
      "A professional profile that shows what you do, and the opportunities you seek and offer.",
  },
  {
    icon: Link2,
    title: "Say What You Need.",
    description:
      "The opportunities you're seeking. The value you offer. Every connection, intentional from the start.",
  },
  {
    icon: BadgeCheck,
    title: "Trust, Built In.",
    description:
      "Your achievements and experience, presented credibly. Trust before the first word.",
  },
] as const;

export function FeaturesSection() {
  return (
    <section id="features" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-roicard-accent">
            Identity
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-roicard-text sm:text-4xl">
          One Identity.{" "}
            <span className="roicard-gradient-text">Every Opportunity.</span>
          </h2>
          <p className="mt-4 text-base text-roicard-text-muted sm:text-lg">
          Roicard isn't a card you carry. It's an identity that carries you.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}
