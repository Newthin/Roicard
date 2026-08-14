/**
 * Step 12 — Success
 *
 * Celebrates account creation. Adapts its checklist to whether the member
 * activated membership now or chose to pay later.
 */

"use client";

import { useJourney } from "@/components/onboarding/journey/JourneyContext";
import { StepHeading } from "@/components/onboarding/journey/StepHeading";
import { Button } from "@/components/ui/Button";
import { Check, Clock, PartyPopper } from "lucide-react";

export function StepSuccess() {
  const { membershipStatus, next } = useJourney();
  const isActive = membershipStatus === "active";

  const items = [
    { label: "Profile Created", done: true },
    { label: "Profile Link Generated", done: true },
    { label: "Roicard Smart Card Reserved", done: true },
    {
      label: isActive ? "Membership Activated" : "Membership — Pending Activation",
      done: isActive,
    },
  ];

  return (
    <div className="space-y-8 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full roicard-gradient text-roicard-on-primary">
          <PartyPopper className="h-8 w-8" />
        </div>
        <StepHeading
          centered
          eyebrow="Success"
          title="Welcome to Roicard!"
          description={
            isActive
              ? "Your membership is active. Your profile is live and your professional identity is taking shape."
              : "Your profile is created — saved privately as a draft. Activate anytime from your dashboard to go live."
          }
        />
      </div>

      <ul className="mx-auto max-w-sm space-y-3 text-left">
        {items.map((item) => (
          <li
            key={item.label}
            className={
              item.done
                ? "flex items-center gap-3 rounded-xl border border-roicard-border bg-roicard-bg-elevated/70 px-4 py-3"
                : "flex items-center gap-3 rounded-xl border border-dashed border-roicard-border px-4 py-3 opacity-75"
            }
          >
            <span
              className={
                item.done
                  ? "flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400"
                  : "flex h-6 w-6 items-center justify-center rounded-full border-[1.5px] border-roicard-text-muted text-roicard-text-muted"
              }
            >
              {item.done ? (
                <Check className="h-4 w-4" />
              ) : (
                <Clock className="h-4 w-4" />
              )}
            </span>
            <span
              className={
                item.done
                  ? "text-sm font-medium text-roicard-text"
                  : "text-sm font-medium text-roicard-text-muted"
              }
            >
              {item.label}
            </span>
          </li>
        ))}
      </ul>

      <Button onClick={next} className="min-w-[220px] rounded-xl">
        Continue
      </Button>
    </div>
  );
}
