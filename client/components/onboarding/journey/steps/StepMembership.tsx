/**
 * Step 05 — Membership
 *
 * Explains the value of membership before any payment. Payment is OPTIONAL:
 * members can activate now or skip and pay later from their dashboard.
 *
 * Premium "exclusivity" layout: eyebrow, Fraunces heading, feature checklist,
 * positioning quote, and a one-time activation price — with the cooler flat
 * accent palette used across the in-app welcome/membership screens.
 */

"use client";

import { useJourney } from "@/components/onboarding/journey/JourneyContext";
import { useAuth } from "@/contexts/AuthContext";
import { MEMBERSHIP_BENEFITS, MEMBERSHIP_FEE_GHS } from "@/lib/profile/types";

/** Membership screen accent — flat orange, distinct from the landing gradient. */
const ACCENT = "#E8622C";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-[18px] flex items-center gap-[10px] text-[12px] font-bold uppercase tracking-[0.16em] text-[#E8622C]">
      <span aria-hidden className="h-[2px] w-7 bg-[#E8622C]" />
      {children}
    </p>
  );
}

function BenefitItem({ label }: { label: string }) {
  return (
    <li className="flex items-start gap-3 py-[11px] text-[16px] font-medium text-[#F5F3EF]">
      <span className="mt-[2px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[rgba(232,98,44,0.14)]">
        <svg viewBox="0 0 12 12" fill="none" className="h-[11px] w-[11px]">
          <path
            d="M2 6L4.5 8.5L10 3"
            stroke={ACCENT}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span>{label}</span>
    </li>
  );
}

export function StepMembership() {
  const { user } = useAuth();
  const { activateMembership, skipMembership, next } = useJourney();

  if (user?.status === "active") {
    return (
      <div className="space-y-7">
        <Eyebrow>Membership</Eyebrow>
        <h1 className="font-serif text-[34px] font-semibold leading-[1.1] tracking-[-0.01em] text-[#F5F3EF] sm:text-[40px]">
          Your Roicard membership
        </h1>
        <p className="max-w-[480px] text-[15.5px] leading-[1.6] text-[#A8AAAE]">
          Your membership is already active — there&apos;s nothing more to do
          here. Continue to complete your profile.
        </p>

        <div className="rounded-[14px] border border-[#2A2C30] bg-[#16181B] px-8 py-7">
          <p className="mb-[10px] text-[13px] font-semibold uppercase tracking-[0.08em] text-[#9A9CA2]">
            Membership includes
          </p>
          <ul className="list-none divide-y divide-[#2A2C30]">
            {MEMBERSHIP_BENEFITS.map((benefit) => (
              <BenefitItem key={benefit} label={benefit} />
            ))}
          </ul>
        </div>

        <button
          type="button"
          onClick={next}
          className="w-full rounded-[10px] bg-[#E8622C] px-4 py-4 text-[15.5px] font-semibold text-white transition-colors hover:bg-[#E8622C]/90"
        >
          Already Paid — Continue
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <Eyebrow>Membership</Eyebrow>
      <h1 className="font-serif text-[34px] font-semibold leading-[1.1] tracking-[-0.01em] text-[#F5F3EF] sm:text-[40px]">
        Your Roicard membership
      </h1>
      <p className="max-w-[480px] text-[15.5px] leading-[1.6] text-[#A8AAAE]">
        A one-time activation unlocks everything Roicard has to offer. You can
        activate now or anytime later — it&apos;s completely optional to
        continue.
      </p>

      <div className="rounded-[14px] border border-[#2A2C30] bg-[#16181B] px-8 py-7">
        <p className="mb-[10px] text-[13px] font-semibold uppercase tracking-[0.08em] text-[#9A9CA2]">
          Membership includes
        </p>
        <ul className="list-none divide-y divide-[#2A2C30]">
          {MEMBERSHIP_BENEFITS.map((benefit) => (
            <BenefitItem key={benefit} label={benefit} />
          ))}
        </ul>

        <p className="mt-5 border-t border-[#2A2C30] pt-5 font-serif text-[17px] font-medium italic leading-[1.5] text-[#D9CFC4]">
          &ldquo;Reserved for professionals building something worth being known
          for.&rdquo;
        </p>

        <div className="mt-6 flex items-baseline justify-between border-t border-[#2A2C30] pt-5">
          <span className="text-[11.5px] font-bold uppercase tracking-[0.1em] text-[#9A9CA2]">
            One-time activation fee
          </span>
          <span className="font-serif text-[26px] font-semibold text-[#F5F3EF]">
            GHS {MEMBERSHIP_FEE_GHS}
          </span>
        </div>
      </div>

      {user?.status === "active" ? (
        <button
          type="button"
          onClick={next}
          className="w-full rounded-[10px] bg-[#E8622C] px-4 py-4 text-[15.5px] font-semibold text-white transition-colors hover:bg-[#E8622C]/90"
        >
          Already Paid — Continue
        </button>
      ) : (
        <button
          type="button"
          onClick={activateMembership}
          className="w-full rounded-[10px] bg-[#E8622C] px-4 py-4 text-[15.5px] font-semibold text-white transition-colors hover:bg-[#E8622C]/90"
        >
          Activate Membership
        </button>
      )}

      <button
        type="button"
        onClick={skipMembership}
        className="block w-full text-center text-[13.5px] text-[#A8AAAE] underline underline-offset-[3px] transition-colors hover:text-[#F5F3EF]"
      >
        Skip for now — I&apos;ll pay later
      </button>
    </div>
  );
}