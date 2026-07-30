/**
 * ProfileHubView
 *
 * Dashboard profile command center at /dashboard/profile.
 * Preview, QR code, public link, completeness, and quick actions.
 */

"use client";

import { ProfileCompletenessCard } from "@/components/profile/ProfileCompletenessCard";
import { ProfilePublicLinkCard } from "@/components/profile/ProfilePublicLinkCard";
import { ProfilePreviewCard } from "@/components/onboarding/ProfilePreviewCard";
import { QrCodePreview } from "@/components/onboarding/QrCodePreview";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { getCurrentUserProfile } from "@/lib/profile/storage";
import type { UserProfile } from "@/lib/profile/types";
import {
  BarChart3,
  Pencil,
  Sparkles,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

function ProfileEmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-roicard-border bg-roicard-bg-elevated p-8 text-center sm:p-12">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-roicard-primary/15">
        <Sparkles className="h-7 w-7 text-roicard-accent" />
      </div>
      <h2 className="mt-5 text-xl font-bold text-roicard-text">
        Create your ROICARD profile
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-roicard-text-muted">
        Complete onboarding to launch your digital business card, get a public
        link, and start sharing with QR and NFC.
      </p>
      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link href="/onboarding">
          <Button size="lg" className="rounded-xl">
            <UserPlus className="h-4 w-4" />
            Start onboarding
          </Button>
        </Link>
        <Link href="/peleg-darkey">
          <Button variant="secondary" size="lg" className="rounded-xl">
            View demo profile
          </Button>
        </Link>
      </div>
    </div>
  );
}

function ProfileStatsSnapshot({ username: _username }: { username: string }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {[
        { label: "Views", value: "—" },
        { label: "Requests", value: "—" },
        { label: "Connections", value: "—" },
      ].map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-roicard-border bg-roicard-bg-muted/40 px-3 py-3 text-center"
        >
          <p className="text-lg font-bold text-roicard-text">
            {item.value.toLocaleString()}
          </p>
          <p className="text-xs text-roicard-text-muted">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

export function ProfileHubView() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    getCurrentUserProfile().then((p) => {
      setProfile(p);
      setIsLoaded(true);
    });
  }, []);

  if (!isLoaded) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-roicard-border border-t-roicard-primary"
          role="status"
          aria-label="Loading profile"
        />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        <header>
          <span className="inline-flex w-fit rounded-full bg-roicard-primary/15 px-3 py-1 text-xs font-medium text-roicard-accent">
            Profile
          </span>
          <h1 className="mt-3 text-2xl font-bold text-roicard-text sm:text-3xl">
            Your Profile
          </h1>
          <p className="mt-2 text-sm text-roicard-text-muted">
            Set up your professional identity and public ROICARD card.
          </p>
        </header>
        <ProfileEmptyState />
      </div>
    );
  }

  const { username, createdAt, membershipStatus, ...formData } = profile;

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex w-fit rounded-full bg-roicard-primary/15 px-3 py-1 text-xs font-medium text-roicard-accent">
              Profile
            </span>
            <span
              className={cn(
                "inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium",
                membershipStatus === "active"
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-roicard-bg-muted text-roicard-text-muted"
              )}
            >
              {membershipStatus === "active"
                ? "Member · Active"
                : "Membership pending"}
            </span>
          </div>
          <h1 className="mt-3 text-2xl font-bold text-roicard-text sm:text-3xl">
            Your Profile
          </h1>
          <p className="mt-2 text-sm text-roicard-text-muted">
            Preview your card, share your link, and keep your identity up to date.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/settings">
            <Button variant="secondary" className="rounded-xl">
              <Pencil className="h-4 w-4" />
              Edit profile
            </Button>
          </Link>
          <Link href={`/${username}`}>
            <Button className="rounded-xl">View public card</Button>
          </Link>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-8">
        {/* Left column: live preview + engagement */}
        <div className="space-y-6">
          {/* Live preview */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-roicard-accent">
              Live preview
            </h2>
            <div className="flex justify-center rounded-2xl border border-roicard-border bg-roicard-bg-elevated/40 p-6 sm:p-10">
              <ProfilePreviewCard
                data={formData}
                username={username}
                className="w-full max-w-sm shadow-[var(--rc-shadow)]"
              />
            </div>
            <p className="text-xs text-roicard-text-muted">
              Created {new Date(createdAt).toLocaleDateString()} · Updates sync to
              your public card instantly
            </p>
          </section>

          {/* Engagement snapshot */}
          <section className="rounded-2xl border border-roicard-border bg-roicard-bg-elevated/40 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-roicard-accent">
                Engagement snapshot
              </h2>
              <Link
                href="/dashboard/analytics"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-roicard-accent hover:text-roicard-text"
              >
                <BarChart3 className="h-3.5 w-3.5" />
                Full analytics
              </Link>
            </div>
            <div className="mt-4">
              <ProfileStatsSnapshot username={username} />
            </div>
            <p className="mt-3 text-xs text-roicard-text-muted">
              Mock data for demo — real metrics will come from the analytics API.
            </p>
          </section>
        </div>

        {/* Sidebar: QR, link, completeness — sticky on desktop */}
        <aside className="lg:sticky lg:top-6">
          <div className="space-y-4">
            <QrCodePreview username={username} />
            <ProfilePublicLinkCard username={username} />
            <ProfileCompletenessCard data={formData} />
          </div>
        </aside>
      </div>
    </div>
  );
}
