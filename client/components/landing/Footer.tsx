/**
 * Footer
 *
 * Simple landing page footer in the warm marketing palette with brand, anchor
 * navigation, and copyright.
 */

import Link from "next/link";

const FOOTER_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how" },
  { label: "Demo", href: "#demo" },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-white/[0.08] px-8 pt-10 pb-[60px]">
      <div className="mx-auto max-w-[1180px]">
        <div className="flex flex-col items-center justify-between gap-6 text-center sm:flex-row sm:text-left">
          <Link
            href="/"
            className="font-display text-[18px] font-extrabold tracking-tight text-[#A8A29A]"
          >
            ROI<span className="bg-[linear-gradient(120deg,#FF7A3D,#C0272D)] bg-clip-text text-transparent">A</span>RD
          </Link>

          <nav className="flex flex-wrap items-center justify-center gap-8">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-[13px] text-[#756F68] transition-colors hover:text-[#F5F3F0]"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <p className="text-[13px] text-[#756F68]">
            © {new Date().getFullYear()} ROICARD. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}