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
import { ArrowLeft, Download, Printer } from "lucide-react";
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

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadQr = async () => {
    try {
      const res = await fetch(qrUrl);
      if (!res.ok) return;
      const blob = await res.blob();
      triggerDownload(blob, `${user.username}-qr.svg`);
    } catch {
      // fetch failed — nothing to download
    }
  };

  const handleDownloadCard = async () => {
    try {
      const qrRes = await fetch(qrUrl);
      const qrSvg = qrRes.ok ? await qrRes.text() : "";

      const esc = (s: string) =>
        s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const fullName = `${esc(user.firstName)} ${esc(user.lastName)}`;
      const title = user.professionalTitle ? esc(user.professionalTitle) : "";
      const org = user.organization ? esc(user.organization) : "";

      // Re-embed the backend QR (a 300x300 SVG) scaled to fit the card box.
      const embedQr = (boxSize: number) => {
        if (!qrSvg) return "";
        const inner = qrSvg
          .replace(/<\?xml[^>]*\?>/, "")
          .replace(/^\s*<svg[^>]*>/i, "")
          .replace(/<\/svg>\s*$/i, "")
          .trim();
        if (!inner) return "";
        return `<svg x="240.5" y="60" width="${boxSize}" height="${boxSize}" viewBox="0 0 300 300" preserveAspectRatio="xMidYMid meet">${inner}</svg>`;
      };

      // 85.6 x 53.98 mm at 96dpi ≈ 323.5 x 204px
      const cardSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="323.5" height="204" viewBox="0 0 323.5 204">
  <defs>
    <linearGradient id="rcAccent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#e63946"/>
      <stop offset="100%" stop-color="#c1121f"/>
    </linearGradient>
    <linearGradient id="rcPanel" x1="0" y1="0" x2="0.5" y2="1">
      <stop offset="0%" stop-color="#e63946"/>
      <stop offset="55%" stop-color="#c1121f"/>
      <stop offset="100%" stop-color="#7f0d14"/>
    </linearGradient>
  </defs>

  <!-- Card base -->
  <rect width="323.5" height="204" fill="#ffffff"/>

  <!-- Top accent bar (white area) -->
  <rect width="213.5" height="9" fill="url(#rcAccent)"/>

  <!-- Ghost watermark -->
  <text x="208" y="188" font-family="Arial, sans-serif" font-size="80" font-weight="900" fill="#e63946" fill-opacity="0.05">R</text>

  <!-- Brand mark + wordmark -->
  <rect x="18" y="24" width="16" height="16" rx="4" fill="#e63946"/>
  <text x="26" y="36" font-family="Arial, sans-serif" font-size="11" font-weight="900" fill="#ffffff" text-anchor="middle">R</text>
  <text x="41" y="36" font-family="Arial, sans-serif" font-size="12.5" font-weight="800" letter-spacing="0.5" fill="#e63946">ROICARD</text>

  <!-- Identity -->
  <text x="18" y="72" font-family="Arial, sans-serif" font-size="16.5" font-weight="700" fill="#111111">${fullName}</text>
  ${title ? `<text x="18" y="90" font-family="Arial, sans-serif" font-size="11" font-weight="500" fill="#4b5563">${title}</text>` : ""}
  ${org ? `<text x="18" y="104" font-family="Arial, sans-serif" font-size="11" fill="#6b7280">${org}</text>` : ""}

  <!-- Footer: scan hint + URL -->
  <line x1="18" y1="148" x2="198" y2="148" stroke="#e5e7eb" stroke-width="1"/>
  <text x="18" y="164" font-family="Arial, sans-serif" font-size="7.5" font-weight="700" letter-spacing="1.8" fill="#6b7280">SCAN TO VIEW PROFILE</text>
  <text x="18" y="179" font-family="Arial, sans-serif" font-size="8.5" fill="#374151">${esc(displayUrl)}</text>

  <!-- Right: gradient QR panel -->
  <rect x="213.5" y="0" width="110" height="204" fill="url(#rcPanel)"/>
  <rect x="232.5" y="52" width="72" height="72" rx="9" fill="#ffffff"/>
  ${qrSvg ? embedQr(56) : `<text x="268.5" y="92" font-family="Arial, sans-serif" font-size="8" fill="#9ca3af" text-anchor="middle">QR unavailable</text>`}
  <text x="321" y="196" font-family="Arial, sans-serif" font-size="13" font-weight="900" letter-spacing="3" fill="#ffffff" fill-opacity="0.12" text-anchor="end">ROICARD</text>
</svg>`;
      triggerDownload(
        new Blob([cardSvg], { type: "image/svg+xml;charset=utf-8" }),
        `${user.username}-card.svg`
      );
    } catch {
      // download failed
    }
  };

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
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleDownloadQr}>
            <Download className="h-4 w-4" aria-hidden />
            QR
          </Button>
          <Button variant="secondary" onClick={handleDownloadCard}>
            <Download className="h-4 w-4" aria-hidden />
            Card
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="h-4 w-4" aria-hidden />
            Print Card
          </Button>
        </div>
      </div>

      <div className="flex justify-center pt-4 print:pt-0">
        <div
          className="relative flex h-[53.98mm] w-[85.6mm] overflow-hidden rounded-lg bg-white text-neutral-900 shadow-2xl shadow-[var(--rc-shadow)] [print-color-adjust:exact]"
          aria-label={`Business card for ${user.firstName} ${user.lastName}`}
        >
          {/* Top accent bar (white area) */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[2.4mm] roicard-gradient [print-color-adjust:exact]" />

          {/* Left: identity + URL text */}
          <div className="relative flex min-w-0 flex-1 flex-col justify-between px-4 pb-3 pt-4">
            {/* Ghost watermark */}
            <span
              aria-hidden
              className="pointer-events-none absolute -bottom-4 right-0 select-none text-[60px] font-black leading-none"
              style={{ color: "rgba(230,57,70,0.05)" }}
            >
              R
            </span>

            <div>
              <p
                className="flex items-center gap-1.5 text-[12px] font-extrabold tracking-tight"
                style={{ color: "#e63946" }}
              >
                <span className="flex h-[11px] w-[11px] items-center justify-center rounded-[3px] bg-[#e63946] text-[8px] font-black text-white">
                  R
                </span>
                ROICARD
              </p>
              <p className="mt-2 truncate text-[16px] font-bold leading-tight text-neutral-900">
                {user.firstName} {user.lastName}
              </p>
              {user.professionalTitle && (
                <p className="mt-0.5 truncate text-[10.5px] font-medium text-neutral-600">
                  {user.professionalTitle}
                </p>
              )}
              {user.organization && (
                <p className="truncate text-[10.5px] text-neutral-600">
                  {user.organization}
                </p>
              )}
            </div>

            <div className="relative border-t border-neutral-200 pt-1.5">
              <p className="text-[7.5px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
                Scan to view profile
              </p>
              <p className="mt-0.5 break-all text-[8.5px] leading-snug text-neutral-700">
                {displayUrl}
              </p>
            </div>
          </div>

          {/* Right: gradient QR panel */}
          <div className="relative flex w-[33mm] shrink-0 items-center justify-center bg-gradient-to-br from-[#e63946] via-[#c1121f] to-[#7f0d14] [print-color-adjust:exact]">
            <span
              aria-hidden
              className="pointer-events-none absolute -bottom-2 -right-1 select-none text-[16px] font-black tracking-widest"
              style={{ color: "rgba(255,255,255,0.12)" }}
            >
              ROICARD
            </span>
            <div className="relative z-10 flex h-[19mm] w-[19mm] items-center justify-center rounded-lg bg-white p-1.5 shadow-inner">
              {qrFailed ? (
                <p className="text-center text-[7px] leading-tight text-neutral-500">
                  QR unavailable
                </p>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrUrl}
                  alt="QR code"
                  width={120}
                  height={120}
                  className="h-full w-full"
                  onError={() => setQrFailed(true)}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <p className="text-center text-sm text-roicard-text-muted print:hidden">
        Card prints at standard business-card size (85.6 x 53.98 mm).
      </p>
    </div>
  );
}
