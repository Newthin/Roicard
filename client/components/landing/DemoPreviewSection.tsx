/**
 * DemoPreviewSection
 *
 * Showcases a live-feeling ROICARD profile preview to build trust and desire.
 * Wraps DemoProfileCard with supporting copy and decorative elements.
 */

import { DemoProfileCard } from "@/components/landing/DemoProfileCard";
import Link from "next/link";

export function DemoPreviewSection() {
  return (
    <section id="demo" className="relative py-24 sm:py-32">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,140,66,0.06),_transparent_70%)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-4 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="text-center lg:text-left">
            <p className="text-sm font-medium uppercase tracking-wider text-roicard-accent">
              Live preview
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-roicard-text sm:text-4xl">
              This Is What{" "}
              <span className="roicard-gradient-text">It Looks Like.</span>
            </h2>
            <p className="mt-4 text-base leading-relaxed text-roicard-text-muted sm:text-lg">
              A real profile. A real presence. This is Roicard, live.
            </p>

            <Link
              href="/alex-morgan"
              className="mt-8 inline-block text-sm font-medium text-roicard-accent transition-colors hover:text-roicard-text"
            >
              See a Full Profile →
            </Link>
          </div>

          <DemoProfileCard />
        </div>
      </div>
    </section>
  );
}
