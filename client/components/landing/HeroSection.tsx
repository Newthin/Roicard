/**
 * HeroSection
 *
 * Landing hero: "You Belong Here." headline with a floating demo identity card
 * alongside. Uses the warm marketing accent palette.
 */

import { DemoProfileCard } from "@/components/landing/DemoProfileCard";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden px-8">
      <div className="mx-auto grid max-w-[1180px] items-center gap-14 py-[90px] pb-[110px] lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <p className="mb-[26px] inline-flex items-center gap-[9px] font-display text-[12.5px] font-bold uppercase tracking-[0.1em] text-[#A8A29A]">
            <span className="inline-block h-[6px] w-[6px] rounded-full bg-[linear-gradient(120deg,#FF7A3D,#C0272D)]" />
            Africa&apos;s Professional Identity Network
          </p>

          <h1 className="font-display text-[44px] font-extrabold leading-[1.05] tracking-[-0.02em] text-[#F5F3F0] sm:text-[56px] lg:text-[62px]">
            You{" "}
            <span className="bg-[linear-gradient(120deg,#FF7A3D,#C0272D)] bg-clip-text text-transparent">
              Belong
            </span>{" "}
            Here.
          </h1>

          <p className="mt-6 max-w-[480px] text-[19px] leading-[1.55] text-[#A8A29A]">
            Built for Africa&apos;s most ambitious professionals — an identity
            that opens doors.
          </p>

          <div className="mt-9 flex flex-col items-center gap-[14px] sm:flex-row">
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 rounded-[10px] bg-[linear-gradient(120deg,#FF7A3D,#C0272D)] px-[26px] py-[14px] text-[15.5px] font-semibold text-white shadow-[0_4px_18px_rgba(255,90,40,0.25)] transition-opacity hover:opacity-90"
            >
              Become a Member
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#demo"
              className="inline-flex items-center rounded-[10px] border border-white/[0.08] bg-white/[0.02] px-6 py-[12px] text-[15px] font-semibold text-[#F5F3F0] transition-colors hover:border-white/20"
            >
              View Profile Demo
            </Link>
          </div>
        </div>

        <DemoProfileCard
          profile={{
            initials: "AM",
            name: "Alex Morgan",
            role: "Product Designer",
            organization: "Acme Inc.",
            location: "Accra, Ghana",
          }}
          className="w-full max-w-sm justify-self-center lg:justify-self-end"
        />
      </div>
    </section>
  );
}