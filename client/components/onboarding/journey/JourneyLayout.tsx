/**
 * JourneyLayout
 *
 * Shared chrome for the onboarding journey: brand mark, theme toggle, a slim
 * progress bar, and an optional Back affordance. Individual steps render their
 * own content (hero or form) inside the centered container.
 */

"use client";

import { useJourney } from "@/components/onboarding/journey/JourneyContext";
import { ProfileAmbientBackdrop } from "@/components/profile/public/ProfileAmbientBackdrop";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { ThemeToggle } from "@/components/theme";
import { cn } from "@/lib/cn";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";

type JourneyLayoutProps = {
  children: ReactNode;
};

export function JourneyLayout({ children }: JourneyLayoutProps) {
  const { step, canGoBack, back, progressPercent, stepIndex, totalSteps } =
    useJourney();

  const isReviewStep = step === "review";

  return (
    <div className="relative flex min-h-screen flex-col bg-roicard-bg">
      {/* Top progress bar */}
      <div className="fixed inset-x-0 top-0 z-20 h-1 bg-roicard-bg-muted">
        <div
          className="h-full roicard-gradient transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
          role="progressbar"
          aria-valuenow={stepIndex + 1}
          aria-valuemin={1}
          aria-valuemax={totalSteps}
        />
      </div>

      {/* Review step — full-width pattern behind header + hero (matches public profile) */}
      {isReviewStep && <ProfileAmbientBackdrop />}

      {/* Header */}
      <header
        className={cn(
          "relative z-10 flex items-center justify-between px-4 pt-6 sm:px-8",
          isReviewStep &&
            "border-b border-roicard-border/50 header-surface backdrop-blur-xl"
        )}
      >
        <Link href="/" className="inline-flex items-center">
          <BrandLogo height={26} />
        </Link>

        <div className="flex items-center gap-3">
          <span className="hidden text-xs font-medium text-roicard-text-muted sm:inline">
            {stepIndex + 1} / {totalSteps}
          </span>
          <ThemeToggle compact />
        </div>
      </header>

      {/* Back affordance */}
      <div className="relative z-10 px-4 pt-4 sm:px-8">
        {canGoBack ? (
          <button
            type="button"
            onClick={back}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-roicard-text-muted transition-colors hover:text-roicard-text"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        ) : (
          <span className="block h-5" aria-hidden />
        )}
      </div>

      {/* Step content */}
      <main className="relative z-10 flex flex-1 items-start justify-center px-4 py-8 sm:px-8 sm:py-12">
        <div key={step} className="onboarding-step-enter w-full max-w-2xl">
          {children}
        </div>
      </main>
    </div>
  );
}
