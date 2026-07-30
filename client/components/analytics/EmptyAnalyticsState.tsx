/**
 * EmptyAnalyticsState
 *
 * Shown when no analytics data is available yet.
 * Encourages users to share their profile to generate insights.
 */

import { Button } from "@/components/ui/Button";
import { BarChart3 } from "lucide-react";
import Link from "next/link";

type EmptyAnalyticsStateProps = {
  onShare?: () => void;
};

export function EmptyAnalyticsState({ onShare }: EmptyAnalyticsStateProps) {
  return (
    <div className="glass-card flex flex-col items-center rounded-2xl px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-roicard-primary/10">
        <BarChart3 className="h-7 w-7 text-roicard-accent" aria-hidden />
      </div>
      <h3 className="text-lg font-semibold text-roicard-text">
        No analytics available yet
      </h3>
      <p className="mt-2 max-w-md text-sm text-roicard-text-muted">
        Start sharing your Roicard profile to generate insights. Track views,
        QR scans, and connection growth as your network expands.
      </p>
      {onShare ? (
        <Button className="mt-6 rounded-xl" onClick={onShare}>
          Share Profile
        </Button>
      ) : (
        <Link href="/dashboard" className="mt-6">
          <Button className="rounded-xl">Share Profile</Button>
        </Link>
      )}
    </div>
  );
}
