/**
 * DraftCountdown
 *
 * Live countdown shown to draft accounts: time remaining until the account
 * is closed by the backend expiration sequence (day 8 after registration).
 * Turns red inside the final 24 hours and shows an expired state once the
 * window has passed (closure happens at the next daily cron run).
 */

"use client";

import { Button } from "@/components/ui/Button";
import { initiatePayment } from "@/lib/api/payments";
import { MEMBERSHIP_FEE_GHS } from "@/lib/profile/types";
import { AlarmClock } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Remaining = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
};

function computeRemaining(target: number): Remaining {
  const totalMs = Math.max(0, target - Date.now());

  const seconds = Math.floor(totalMs / 1000);
  return {
    days: Math.floor(seconds / 86400),
    hours: Math.floor((seconds % 86400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60,
    totalMs,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

export function DraftCountdown({ closesAt }: { closesAt: string }) {
  const target = new Date(closesAt).getTime();
  const [remaining, setRemaining] = useState<Remaining | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setRemaining(computeRemaining(target));
    const id = setInterval(() => setRemaining(computeRemaining(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  const handleActivate = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const { redirect } = await initiatePayment({
        amount: MEMBERSHIP_FEE_GHS,
        currency: "GHS",
        method: "card",
      });
      const providerRedirect = redirect as {
        authorization_url?: string;
        status?: string;
      };
      if (providerRedirect?.status === "success") {
        window.location.reload();
        return;
      }
      if (providerRedirect?.authorization_url) {
        window.location.assign(providerRedirect.authorization_url);
      } else {
        setIsSubmitting(false);
      }
    } catch {
      setIsSubmitting(false);
    }
  }, [isSubmitting]);

  if (!remaining) return null;

  const expired = remaining.totalMs <= 0;
  const urgent = !expired && remaining.totalMs < 24 * 3600 * 1000;

  const units: Array<[string, string]> = [
    [String(remaining.days), "days"],
    [pad(remaining.hours), "hrs"],
    [pad(remaining.minutes), "min"],
    [pad(remaining.seconds), "sec"],
  ];

  return (
    <section
      className={`rounded-2xl border p-6 ${
        expired
          ? "border-rose-500/40 bg-rose-500/10"
          : urgent
            ? "border-red-500/50 bg-gradient-to-br from-red-500/10 to-roicard-bg-elevated"
            : "border-amber-500/40 bg-gradient-to-br from-amber-500/10 to-roicard-bg-elevated"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              expired || urgent ? "bg-red-500/15" : "bg-amber-500/15"
            }`}
          >
            <AlarmClock
              className={`h-5 w-5 ${expired || urgent ? "text-red-400" : "text-amber-400"}`}
            />
          </div>
          <div>
            <h2 className="text-base font-bold text-roicard-text">
              {expired
                ? "Your activation window has ended"
                : "Your draft profile expires in"}
            </h2>
            <p className="text-sm text-roicard-text-muted">
              {expired
                ? "Your account will be closed shortly. Activate now to keep your profile, link, and card."
                : "After the deadline your account is closed and your reserved card is released."}
            </p>
          </div>
        </div>

        {!expired && (
          <div className="flex items-center gap-2" aria-live="polite">
            {units.map(([value, label]) => (
              <div
                key={label}
                className={`flex min-w-[3.25rem] flex-col items-center rounded-xl border px-2 py-2 ${
                  urgent
                    ? "border-red-500/40 bg-red-500/10"
                    : "border-roicard-border bg-roicard-bg-muted"
                }`}
              >
                <span
                  className={`text-lg font-bold tabular-nums ${
                    urgent ? "text-red-400" : "text-roicard-text"
                  }`}
                >
                  {value}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-roicard-text-muted">
                  {label}
                </span>
              </div>
            ))}
          </div>
        )}

        <Button
          onClick={handleActivate}
          disabled={isSubmitting}
          variant={urgent || expired ? "danger" : "primary"}
          className="rounded-xl"
        >
          {isSubmitting ? "Redirecting…" : "Activate Membership"}
        </Button>
      </div>
    </section>
  );
}
