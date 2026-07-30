/**
 * LandingNavbar
 *
 * Fixed top navigation for the public landing page.
 * Provides brand presence and quick access to auth routes.
 */

"use client";

import { BrandLogo } from "@/components/ui/BrandLogo";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/theme";
import { cn } from "@/lib/cn";
import Link from "next/link";
import { useEffect, useState } from "react";

export function LandingNavbar() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        isScrolled
          ? "border-b border-roicard-border/60 header-surface backdrop-blur-xl"
          : "bg-transparent"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
        <Link href="/" className="inline-flex items-center">
          <BrandLogo height={26} />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link
            href="#features"
            className="text-sm text-roicard-text-muted transition-colors hover:text-roicard-text"
          >
            Features
          </Link>
          <Link
            href="#how-it-works"
            className="text-sm text-roicard-text-muted transition-colors hover:text-roicard-text"
          >
            How it works
          </Link>
          <Link
            href="#demo"
            className="text-sm text-roicard-text-muted transition-colors hover:text-roicard-text"
          >
            Demo
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle compact />
          <Link href="/auth/login" className="hidden sm:block">
            <Button variant="ghost" size="sm" className="text-roicard-text-muted">
              Sign in
            </Button>
          </Link>
          <Link href="/auth/register">
            <Button size="sm" className="rounded-lg">
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
