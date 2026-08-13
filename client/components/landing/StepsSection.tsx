/**
 * StepsSection
 *
 * "How it works" four-step explainer for the ROICARD user journey.
 * Uses a clean numbered step layout with connecting visual flow.
 */

import { Compass, Link2, QrCode, UserPlus } from "lucide-react";

const STEPS = [
  {
    number: "01",
    icon: UserPlus,
    title: "Create Your Professional Identity",
    description:
      "Build a professional profile that showcases your experience, achievements, aspirations, and opportunities.",
  },
  {
    number: "02",
    icon: QrCode,
    title: "Share Your Identity Anywhere",
    description:
      "Use your Roicard profile, QR code, or Smart Card to instantly introduce yourself wherever opportunities happen.",
  },
  {
    number: "03",
    icon: Link2,
    title: "Turn Connections Into Opportunities",
    description:
      "Grow your network, discover mentors and collaborators, and unlock opportunities aligned with your goals.",
  },
  {
    number: "04",
    icon: Compass,
    title: "Discover Opportunities",
    description:
      "Every profile, every connection, every conversation feeds into one thing: real opportunity.",
  },
] as const;

export function StepsSection() {
  return (
    <section id="how-it-works" className="relative py-24 sm:py-32">
      {/* Subtle section divider glow */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-roicard-border to-transparent"
        aria-hidden
      />

      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-roicard-accent">
            How it works
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-roicard-text sm:text-4xl">  
            Build Your Identity. {" "}
            <span className="roicard-gradient-text">Expand Your Network. </span>
            Unlock Opportunities.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-roicard-text-muted">
            Roicard isn&rsquo;t a one-time exchange. It&rsquo;s a journey &mdash; from the moment someone taps
            your card to the relationships and opportunities that follow.
          </p>
        </div>

        <div className="relative mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {/* Connecting line — desktop only */}
          <div
            className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-14 hidden h-px bg-gradient-to-r from-roicard-primary/40 via-roicard-accent/40 to-roicard-primary/40 lg:block"
            aria-hidden
          />

          {STEPS.map((step) => (
            <div key={step.number} className="relative flex flex-col items-center text-center">
              <div className="relative z-10 mb-6 flex h-16 w-16 items-center justify-center rounded-2xl glass-card ring-1 ring-roicard-primary/20">
                <step.icon className="h-7 w-7 text-roicard-accent" aria-hidden />
                <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full roicard-gradient text-xs font-bold text-roicard-text">
                  {step.number}
                </span>
              </div>

              <h3 className="text-xl font-semibold text-roicard-text">{step.title}</h3>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-roicard-text-muted">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-16 max-w-2xl text-center text-base italic leading-relaxed text-roicard-text-muted">
          <strong className="font-semibold not-italic text-roicard-text">
            Meaningful relationships create meaningful opportunities.
          </strong>
          <br />
          This is how Roicard makes that real, one connection at a time.
        </p>
      </div>
    </section>
  );
}
