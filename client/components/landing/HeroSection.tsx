/**
 * HeroSection
 *
 * Main landing entry point of ROICARD showcasing the core value proposition.
 * Includes headline, CTAs, and a cinematic hero visual (identity card mock).
 */

import { LandingProfilePreview } from "@/components/landing/LandingProfilePreview";
import { Button } from "@/components/ui/Button";
import { DEMO_USER_PROFILE } from "@/lib/profile/demo";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-28 pb-20 sm:pt-36 sm:pb-28 lg:pb-32">
      {/* Cinematic background layers */}
      <div className="landing-glow pointer-events-none absolute inset-0" aria-hidden />
      <div
        className="pointer-events-none absolute -right-40 top-20 h-[480px] w-[480px] rounded-full bg-roicard-accent/10 blur-[120px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-40 bottom-0 h-[400px] w-[400px] rounded-full bg-roicard-primary/10 blur-[100px]"
        aria-hidden
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-4 lg:grid-cols-2 lg:gap-12 lg:px-8">
        {/* Copy column */}
        <div className="text-center lg:text-left">
          <div className="mb-6 inline-flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-roicard-text-muted">
            <span className="h-1.5 w-1.5 rounded-full roicard-gradient" aria-hidden />
            Africa&rsquo;s Professional Identity Network
          </div>

          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-roicard-text sm:text-5xl lg:text-6xl xl:text-[3.5rem]">
            You{" "}
            <span className="roicard-gradient-text">Belong</span>{" "}
            Here.
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-roicard-text-muted sm:text-lg lg:mx-0">
            Built for Africa&rsquo;s most ambitious professionals &mdash; an identity that opens doors.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
            <Link href="/auth/register">
              <Button
                size="lg"
                className="group h-12 min-w-[180px] rounded-xl px-8 text-base shadow-lg shadow-roicard-primary/25 transition-all hover:shadow-roicard-primary/40 sm:h-14"
              >
                Become a Member
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </Link>
            <Link href="#demo">
              <Button
                variant="secondary"
                size="lg"
                className="h-12 min-w-[180px] rounded-xl border-roicard-border/80 bg-roicard-bg-elevated/50 px-8 text-base backdrop-blur-sm transition-all hover:border-roicard-accent/40 sm:h-14"
              >
                View Profile Demo
              </Button>
            </Link>
          </div>
        </div>

        {/* Hero visual — premium floating identity card mock (decorative) */}
        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          {/* `inert` keeps the showcase out of the tab order + a11y tree */}
          <div
            className="landing-float relative z-10 mx-auto w-full max-w-sm"
            inert
          >
            <LandingProfilePreview
              profile={DEMO_USER_PROFILE}
              className="shadow-2xl shadow-black/50 ring-1 ring-white/10"
            />
          </div>

          {/* Decorative background cards for depth */}
          <div
            className="absolute -right-4 top-8 -z-10 h-full w-full max-w-sm rotate-6 rounded-3xl border border-roicard-border/40 bg-roicard-bg-muted/30 blur-[1px]"
            aria-hidden
          />
          <div
            className="absolute -left-4 top-16 -z-10 h-full w-full max-w-sm -rotate-3 rounded-3xl border border-roicard-border/30 bg-roicard-bg-elevated/20"
            aria-hidden
          />
        </div>
      </div>
    </section>
  );
}
