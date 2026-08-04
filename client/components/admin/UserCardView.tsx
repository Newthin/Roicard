/**
 * UserCardView
 *
 * Printable business card for a platform user — their public profile URL plus
 * a QR code encoding that same URL. The card prints at exact standard
 * business-card size (85.6mm x 53.98mm); only the card appears on paper.
 *
 * Route: /admin/users/card/[id]
 */

"use client";

import { useAdmin } from "@/components/admin/AdminProvider";
import { Button } from "@/components/ui/Button";
import { getPublicProfileUrl } from "@/lib/profile/username";
import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export function UserCardView({ userId }: { userId: string }) {
  const { users, isLoading } = useAdmin();
  const [qrFailed, setQrFailed] = useState(false);
  const [profileUrl, setProfileUrl] = useState("");

  const user = users.find((u) => u.id === userId);

  // Resolve the absolute public URL client-side so SSR never sees
  // window.location (avoids a hydration mismatch on the URL text).
  useEffect(() => {
    if (user?.username) {
      setProfileUrl(getPublicProfileUrl(user.username));
    }
  }, [user?.username]);

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-roicard-border border-t-roicard-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-roicard-border bg-roicard-bg-elevated p-8 text-center">
        <p className="text-sm text-roicard-text-muted">User not found.</p>
        <Link
          href="/admin/users"
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-roicard-accent hover:text-roicard-text"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to Users
        </Link>
      </div>
    );
  }

  if (!user.username) {
    return (
      <div className="rounded-2xl border border-roicard-border bg-roicard-bg-elevated p-8 text-center">
        <p className="text-sm text-roicard-text">
          {user.firstName} {user.lastName} doesn't have a public profile yet.
        </p>
        <p className="mt-1 text-sm text-roicard-text-muted">
          A card can be generated once the user completes onboarding (a profile
          URL is created then).
        </p>
        <Link
          href="/admin/users"
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-roicard-accent hover:text-roicard-text"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to Users
        </Link>
      </div>
    );
  }

  const displayUrl = profileUrl.replace(/^https?:\/\//, "");
  const qrUrl = `${apiBase}/qr/${encodeURIComponent(user.username)}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-2 text-sm font-medium text-roicard-text-muted transition-colors hover:text-roicard-text"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to Users
        </Link>
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4" aria-hidden />
          Print Card
        </Button>
      </div>

      <div className="flex justify-center pt-4 print:pt-0">
        <div
          className="flex h-[53.98mm] w-[85.6mm] items-stretch overflow-hidden rounded-lg bg-white text-neutral-900 shadow-2xl shadow-[var(--rc-shadow)] [print-color-adjust:exact]"
          aria-label={`Business card for ${user.firstName} ${user.lastName}`}
        >
          {/* Left: identity + URL text */}
          <div className="flex min-w-0 flex-1 flex-col justify-between p-3.5">
            <div>
              <p className="text-[13px] font-extrabold tracking-tight" style={{ color: "#e63946" }}>
                ROICARD
              </p>
              <p className="mt-2.5 truncate text-[15px] font-bold leading-tight text-neutral-900">
                {user.firstName} {user.lastName}
              </p>
              {user.professionalTitle && (
                <p className="mt-0.5 truncate text-[10.5px] text-neutral-600">
                  {user.professionalTitle}
                </p>
              )}
              {user.organization && (
                <p className="truncate text-[10.5px] text-neutral-600">
                  {user.organization}
                </p>
              )}
            </div>

            <div className="border-t border-neutral-200 pt-2">
              <p className="text-[8.5px] font-medium uppercase tracking-wider text-neutral-500">
                Scan to view profile
              </p>
              <p className="mt-0.5 break-all text-[8.5px] leading-snug text-neutral-700">
                {displayUrl}
              </p>
            </div>
          </div>

          {/* Right: QR code */}
          <div className="flex w-[32mm] shrink-0 items-center justify-center border-l border-neutral-200 p-2">
            {qrFailed ? (
              <p className="text-center text-[8px] leading-snug text-neutral-500">
                QR unavailable
              </p>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrUrl}
                alt="QR code"
                width={120}
                height={120}
                className="h-auto w-[28mm] max-w-full"
                onError={() => setQrFailed(true)}
              />
            )}
          </div>
        </div>
      </div>

      <p className="text-center text-sm text-roicard-text-muted print:hidden">
        Card prints at standard business-card size (85.6 x 53.98 mm).
      </p>
    </div>
  );
}
