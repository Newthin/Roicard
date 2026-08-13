/**
 * CTASection
 *
 * Closing "You Belong Here." conversion block on the landing page. Uses the
 * full orange → red gradient band with the primary member CTA.
 */

import Link from "next/link";

export function CTASection() {
  return (
    <section className="px-8 pb-[100px]">
      <div className="mx-auto max-w-[1180px]">
        <div className="rounded-[28px] bg-[linear-gradient(120deg,#FF7A3D,#C0272D)] px-6 py-[80px] text-center sm:px-[60px]">
          <h2 className="font-display text-[36px] font-extrabold leading-tight text-white sm:text-[44px]">
            You Belong Here.
          </h2>
          <p className="mx-auto mt-4 max-w-[480px] text-[18px] text-white/90">
            Your professional identity, ready when you are.
          </p>

          <Link
            href="/auth/register"
            className="mt-9 inline-flex items-center rounded-[10px] bg-white px-[26px] py-[14px] text-[15.5px] font-semibold text-[#C0272D] shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition-colors hover:bg-white/95"
          >
            Become a Member →
          </Link>
        </div>
      </div>
    </section>
  );
}