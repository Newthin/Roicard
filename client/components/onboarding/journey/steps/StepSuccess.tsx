/**
 * Step 08 — Success
 *
 * Welcome screen shown right after the membership decision. Visually follows
 * the premium welcome mockup (cool dark palette, flat orange accent, Fraunces
 * heading) while staying a mid-journey checkpoint: the checklist reflects real
 * account state and the primary CTA continues onboarding.
 */

"use client";

import { useJourney } from "@/components/onboarding/journey/JourneyContext";
import { useAuth } from "@/contexts/AuthContext";

const ACCENT = "#E8622C";

function DoneIcon() {
  return (
    <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-[rgba(75,158,122,0.14)]">
      <svg viewBox="0 0 12 12" fill="none" className="h-[11px] w-[11px]">
        <path
          d="M2 6L4.5 8.5L10 3"
          stroke="#4B9E7A"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function PendingIcon() {
  return (
    <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-[#6C6E73]">
      <svg viewBox="0 0 12 12" fill="none" className="h-[11px] w-[11px]">
        <circle cx="6" cy="6" r="4.5" stroke="#6C6E73" strokeWidth="1.3" />
        <path
          d="M6 3.5V6L7.5 7"
          stroke="#6C6E73"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

export function StepSuccess() {
  const { membershipStatus, next, activateMembership } = useJourney();
  const { user } = useAuth();
  const isActive = membershipStatus === "active";
  const firstName = user?.first_name || "there";

  const items = [
    { label: "Profile created", done: true },
    { label: "Profile link generated", done: true },
    {
      label: "Roicard Smart Card",
      done: isActive,
      meta: isActive ? "Activated" : "Pending activation",
    },
  ];

  return (
    <div className="mx-auto max-w-[560px] space-y-8 text-center">
      <div className="flex flex-col items-center gap-[18px]">
        <span className="flex h-14 w-14 items-center justify-center rounded-full border-[1.5px] border-[#E8622C]">
          <svg viewBox="0 0 24 24" fill="none" className="h-[22px] w-[22px]">
            <path
              d="M4 12L10 18L20 6"
              stroke={ACCENT}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>

        <div className="space-y-2">
          <p className="text-[11.5px] font-bold uppercase tracking-[0.18em] text-[#E8622C]">
            Account Created
          </p>
          <h1 className="font-serif text-[30px] font-semibold leading-[1.15] tracking-[-0.01em] text-[#F5F3EF] sm:text-[34px]">
            Your professional identity is live.
          </h1>
          <p className="mx-auto max-w-[420px] text-[15px] leading-[1.6] text-[#A8AAAE]">
            {firstName}, your Roicard profile is set up and ready to share.
            {isActive
              ? " Your membership is active and your Smart Card is unlocked."
              : " Activate your membership anytime to unlock your Smart Card."}
          </p>
        </div>
      </div>

      <ul className="space-y-[10px] text-left">
        {items.map((item) => (
          <li
            key={item.label}
            className={`flex items-center gap-[14px] rounded-[10px] border px-[18px] py-[15px] ${
              item.done
                ? "border-[#2A2C30] bg-[#16181B]"
                : "border-dashed border-[#3A3D42] bg-transparent"
            }`}
          >
            {item.done ? <DoneIcon /> : <PendingIcon />}
            <span
              className={`text-[15px] font-medium ${
                item.done ? "text-[#F5F3EF]" : "text-[#A8AAAE]"
              }`}
            >
              {item.label}
            </span>
            {item.meta && (
              <span className="ml-auto text-[12px] font-medium text-[#6C6E73]">
                {item.meta}
              </span>
            )}
          </li>
        ))}
      </ul>

      <div className="rounded-xl border border-[#2A2C30] bg-[#16181B] px-6 py-[22px] text-left">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-[#6C6E73]">
          Next step
        </p>
        <p className="text-[15px] leading-[1.5] text-[#A8AAAE]">
          Your profile link is ready to share. Add it to your email signature
          or send it directly — continue onboarding to round out your profile,
          and activate your membership anytime to unlock your Smart Card.
        </p>
      </div>

      <div className="space-y-[14px]">
        <button
          type="button"
          onClick={next}
          className="w-full rounded-[10px] bg-[#E8622C] px-4 py-4 text-[15.5px] font-semibold text-white transition-colors hover:bg-[#E8622C]/90"
        >
          Continue
        </button>
        {!isActive && (
          <button
            type="button"
            onClick={activateMembership}
            className="block w-full text-center text-[13.5px] text-[#A8AAAE] underline underline-offset-[3px] transition-colors hover:text-[#F5F3EF]"
          >
            Activate membership now
          </button>
        )}
      </div>
    </div>
  );
}