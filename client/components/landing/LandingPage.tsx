/**
 * LandingPage
 *
 * Root assembler for the ROICARD public marketing homepage.
 * Composes all landing sections in scroll order for the / route.
 *
 * The landing page intentionally uses the warm marketing palette (near-black
 * warm base, orange → red gradient accent, Manrope/Inter typography) which is
 * distinct from the cooler in-app palette used on the welcome + membership
 * screens.
 */

import { CTASection } from "@/components/landing/CTASection";
import { DemoPreviewSection } from "@/components/landing/DemoPreviewSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { Footer } from "@/components/landing/Footer";
import { HeroSection } from "@/components/landing/HeroSection";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { StepsSection } from "@/components/landing/StepsSection";

export function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0A0A0A] text-[#F5F3F0] [background-image:radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(255,122,61,0.10),transparent)]">
      <LandingNavbar />

      <main>
        <HeroSection />
        <FeaturesSection />
        <StepsSection />
        <DemoPreviewSection />
        <CTASection />
      </main>

      <Footer />
    </div>
  );
}