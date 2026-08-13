/**
 * FeaturesSection
 *
 * Grid of ROICARD product capabilities using FeatureCard components.
 * Highlights core value props: identity, sharing, connections, analytics.
 */

import { FeatureCard } from "@/components/landing/FeatureCard";
import {
  BarChart3,
  Link2,
  QrCode,
  Shield,
  UserCircle,
  Users,
} from "lucide-react";

const FEATURES = [
  {
    icon: UserCircle,
    title: "Professional Identity",
    description:
      "Create a professional profile that showcases who you are, what you do, and the opportunities you seek and offer.",
  },
  {
    icon: QrCode,
    title: "Instant Identity Sharing",
    description:
      "Share your professional identity in seconds through your Roicard profile, QR code, or Smart Card experience."
  },
  {
    icon: Link2,
    title: "Meaningful Connections",
    description:
      "Connect with professionals, students, founders, mentors, and opportunities that align with your goals.",
  },
  {
    icon: Users,
    title: "Community & Opportunity Network",
    description:
      "Discover people who can help you grow and make it easier for others to discover what you seek and offer.",
  },
  {
    icon: BarChart3,
    title: "Seeking & Offering",
    description:
      "Let others know the opportunities you’re seeking and the value you can offer, making every connection more intentional.",
  },
  {
    icon: Shield,
    title: "Verified Professional Presence",
    description:
      "Build trust with a professional profile designed to present your achievements, experience, and aspirations credibly.",
  },
] as const;

export function FeaturesSection() {
  return (
    <section id="features" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-roicard-accent">
            Features
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-roicard-text sm:text-4xl">
          Build Your Professional Identity.{" "}
            <span className="roicard-gradient-text">Expand Your Opportunities.</span>
          </h2>
          <p className="mt-4 text-base text-roicard-text-muted sm:text-lg">
          Roicard helps you build a credible professional presence, create meaningful connections, 
          and unlock opportunities through one professional identity network.
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
