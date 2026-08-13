/**
 * CTASection
 *
 * High-conversion call-to-action block near the bottom of the landing page.
 * Uses gradient highlight background to drive sign-ups.
 */

import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CTASection() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-roicard-border/60">
          {/* Gradient background highlight */}
          <div className="absolute inset-0 roicard-gradient opacity-90" aria-hidden />
          <div
            className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]"
            aria-hidden
          />
          <div className="absolute inset-0 bg-roicard-bg/20 backdrop-blur-[2px]" aria-hidden />

          <div className="relative px-6 py-16 text-center sm:px-12 sm:py-20">
            <h2 className="text-3xl font-bold tracking-tight text-roicard-on-primary sm:text-4xl lg:text-5xl">
            Where Identity Meets Opportunity.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-roicard-on-primary/80 sm:text-lg">
            Build your professional presence, 
            connect with purpose, and unlock opportunities through the Roicard community.
            </p>

            <Link href="/auth/register" className="mt-10 inline-block">
              <Button
                size="lg"
                className="group h-14 min-w-[220px] rounded-xl border-2 border-white/20 bg-white px-8 text-base font-semibold text-roicard-primary shadow-xl transition-all hover:bg-white/95 hover:shadow-2xl"
              >
                Create Your Roicard
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
