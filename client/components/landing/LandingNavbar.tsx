/**
 * LandingNavbar
 *
 * Top navigation for the public landing page — warm marketing palette.
 * Links are static destinations in the mockup, wired here to real routes:
 * Features / How it works / Demo are in-page anchors, Sign in and Become a
 * Member point at the real auth routes.
 */

import Link from "next/link";

export function LandingNavbar() {
  return (
    <header className="relative z-50">
      <div className="mx-auto flex max-w-[1180px] items-center justify-between border-b border-white/[0.08] px-8 py-7">
        <Link href="/" className="font-display text-[22px] font-extrabold tracking-tight text-[#F5F3F0]">
          ROI<span className="bg-[linear-gradient(120deg,#FF7A3D,#C0272D)] bg-clip-text text-transparent">A</span>RD
        </Link>

        <nav className="hidden items-center gap-10 text-[15px] text-[#A8A29A] md:flex">
          <Link href="#features" className="transition-colors hover:text-[#F5F3F0]">
            Features
          </Link>
          <Link href="#how" className="transition-colors hover:text-[#F5F3F0]">
            How it works
          </Link>
          <Link href="#demo" className="transition-colors hover:text-[#F5F3F0]">
            Demo
          </Link>
        </nav>

        <div className="flex items-center gap-5 text-[15px]">
          <Link
            href="/auth/login"
            className="hidden text-[#A8A29A] transition-colors hover:text-[#F5F3F0] sm:block"
          >
            Sign in
          </Link>
          <Link
            href="/auth/register"
            className="inline-flex items-center rounded-[10px] bg-[linear-gradient(120deg,#FF7A3D,#C0272D)] px-[22px] py-[11px] text-[14.5px] font-semibold text-white shadow-[0_4px_18px_rgba(255,90,40,0.25)] transition-opacity hover:opacity-90"
          >
            Become a Member
          </Link>
        </div>
      </div>
    </header>
  );
}