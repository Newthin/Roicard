/**
 * LandingPage
 *
 * Root assembler for the ROICARD public marketing homepage.
 * Composes all landing sections in scroll order for the / route.
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
    <div className="relative min-h-screen overflow-x-hidden bg-roicard-bg">
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
