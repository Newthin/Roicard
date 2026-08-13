/**
 * Footer
 *
 * Simple landing page footer with logo, navigation links, and copyright.
 * Keeps the public site feeling complete and trustworthy.
 */

import { BrandLogo } from "@/components/ui/BrandLogo";
import Link from "next/link";

const FOOTER_LINKS = [
  { label: "About", href: "#features" },
  { label: "Privacy", href: "#" },
  { label: "Contact", href: "#" },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-roicard-border/60 bg-roicard-bg">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 py-12 sm:flex-row lg:px-8">
        {/* Logo */}
        <Link href="/" className="inline-flex items-center">
          <BrandLogo height={26} />
        </Link>

        {/* Nav links */}
        <nav className="flex flex-wrap items-center justify-center gap-6">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm text-roicard-text-muted transition-colors hover:text-roicard-text"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <p className="text-xs text-roicard-text-muted">
          © {new Date().getFullYear()} ROICARD. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
