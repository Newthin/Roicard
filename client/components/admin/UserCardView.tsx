/**
 * UserCardView
 *
 * Printable NFC card for a platform user, using the same physical card
 * design as the admin Generate Card preview: dark front with the ROICARD
 * wordmark + member name, and a back face with the QR code.
 *
 * Route: /admin/users/card/[id]
 */

"use client";

import { useAdmin } from "@/components/admin/AdminProvider";
import { CardPreview } from "@/components/admin/CardPreview";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, Download, Printer } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function UserCardView({ userId }: { userId: string }) {
  const { users, isLoading } = useAdmin();

  const user = users.find((u) => u.id === userId);

  // Resolve the member's card data once the user is available.
  const memberName = user
    ? `${user.firstName} ${user.lastName}`.trim().toUpperCase()
    : "";
  const qrUrl = user?.username
    ? `${apiBase}/qr/${encodeURIComponent(user.username)}`
    : "";

  const triggerDownload = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadQr = async () => {
    if (!qrUrl) return;
    try {
      const res = await fetch(qrUrl);
      if (!res.ok) return;
      const blob = await res.blob();
      triggerDownload(blob, `${user?.username}-qr.svg`);
    } catch {
      // fetch failed — nothing to download
    }
  };

  const handleDownloadCard = async () => {
    if (!qrUrl) return;
    try {
      const qrRes = await fetch(qrUrl);
      const qrSvg = qrRes.ok ? await qrRes.text() : "";

      // Re-embed the backend QR (a 300x300 SVG) scaled to the back face.
      const embedQr = (cx: number, cy: number, size: number) => {
        if (!qrSvg) return "";
        const inner = qrSvg
          .replace(/<\?xml[^>]*\?>/, "")
          .replace(/^\s*<svg[^>]*>/i, "")
          .replace(/<\/svg>\s*$/i, "")
          .trim();
        if (!inner) return "";
        return `<svg x="${cx - size / 2}" y="${cy - size / 2}" width="${size}" height="${size}" viewBox="0 0 300 300" preserveAspectRatio="xMidYMid meet">${inner}</svg>`;
      };

      // 85.6 x 53.98 mm at 96dpi ≈ 323.5 x 204px per face; both faces side by side.
      const cardSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="647" height="204" viewBox="0 0 647 204">
  <defs>
    <linearGradient id="cardBg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0a0a0a"/>
      <stop offset="100%" stop-color="#000000"/>
    </linearGradient>
    <linearGradient id="wordmarkGradient" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#f97316"/>
      <stop offset="100%" stop-color="#ef4444"/>
    </linearGradient>
    <radialGradient id="streakGlow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.35"/>
      <stop offset="55%" stop-color="#ffffff" stop-opacity="0.06"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- ================= FRONT ================= -->
  <g>
    <rect width="323.5" height="204" fill="url(#cardBg)"/>

    <!-- Subtle curved light streaks -->
    <ellipse cx="305" cy="42" rx="132" ry="82" fill="url(#streakGlow)" opacity="0.5" transform="rotate(-22 305 42)"/>
    <circle cx="352" cy="92" r="46" fill="url(#streakGlow)" opacity="0.2"/>
    <ellipse cx="34" cy="216" rx="136" ry="82" fill="url(#streakGlow)" opacity="0.35" transform="rotate(20 34 216)"/>
    <circle cx="-12" cy="242" r="42" fill="url(#streakGlow)" opacity="0.12"/>

    <!-- ROICARD wordmark: A in gradient orange → red -->
    <text x="28" y="44" font-family="Arial, sans-serif" font-size="21" font-weight="800" letter-spacing="6" fill="#ffffff">
      <tspan>ROIC</tspan><tspan fill="url(#wordmarkGradient)">A</tspan><tspan>RD</tspan>
    </text>

    <!-- Member name -->
    <text x="28" y="170" font-family="Arial, sans-serif" font-size="14" font-weight="500" letter-spacing="3" fill="#ffffff">${esc(memberName)}</text>
  </g>

  <!-- ================= BACK ================= -->
  <g transform="translate(323.5, 0)">
    <rect width="323.5" height="204" fill="url(#cardBg)"/>

    <ellipse cx="30" cy="42" rx="132" ry="82" fill="url(#streakGlow)" opacity="0.5" transform="rotate(-22 30 42)"/>
    <ellipse cx="295" cy="216" rx="136" ry="82" fill="url(#streakGlow)" opacity="0.35" transform="rotate(20 295 216)"/>

    <!-- QR code in a white rounded container -->
    <rect x="103.75" y="36" width="116" height="116" rx="18" fill="#ffffff"/>
    ${qrSvg ? embedQr(161.75, 94, 100) : `<text x="161.75" y="98" font-family="Arial, sans-serif" font-size="9" fill="#9ca3af" text-anchor="middle">QR unavailable</text>`}

    <!-- Scan hint -->
    <text x="161.75" y="180" font-family="Arial, sans-serif" font-size="10" font-weight="700" letter-spacing="3" fill="#ffffff" text-anchor="middle">TAP. SCAN. CONNECT.</text>

    <!-- Reference slug -->
    <text x="18" y="196" font-family="Arial, sans-serif" font-size="6.5" font-weight="500" letter-spacing="2" fill="#ffffff" opacity="0.3">${esc(user?.username ?? "")}</text>
  </g>
</svg>`;

      triggerDownload(
        new Blob([cardSvg], { type: "image/svg+xml;charset=utf-8" }),
        `${user?.username}-card.svg`
      );
    } catch {
      // download failed
    }
  };

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

      <div className="flex flex-col items-center gap-6 pt-4 print:pt-0">
        <CardPreview
          memberName={memberName}
          qrCodeUrl={qrUrl}
          slug={user.username}
        />
      </div>

      <p className="text-center text-sm text-roicard-text-muted print:hidden">
        Card prints at standard physical-card size (85.6 × 53.98 mm). Download
        the combined SVG for both faces.
      </p>
    </div>
  );
}