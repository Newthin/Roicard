/**
 * CardPreview
 *
 * Visual preview of the physical NFC card that gets printed and shipped to
 * members. Renders both faces (FRONT / BACK) at the standard card aspect
 * ratio so admins can eyeball the exact artwork before generating cards.
 *
 * Route: /admin/cards/generate
 */

"use client";

import { QrCode } from "lucide-react";
import { useState } from "react";

export type CardPreviewProps = {
  /** Member's full name, e.g. "MOSES GODSWORD" (rendered uppercase). */
  memberName: string;
  /** Full URL to the QR code image or a data URL. */
  qrCodeUrl: string;
  /** Member's profile slug (for reference on the back face). */
  slug: string;
  /** Optional serial number (small text, bottom-right back side). */
  cardNumber?: string;
};

/**
 * Subtle organic light streaks used as artwork on both faces — white/gray
 * curved glows top-right and bottom-left. Pure CSS blobs (no SVG defs) so it
 * can be mounted multiple times on one page without id collisions.
 */
function CardArtwork() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Top-right streak */}
      <div className="absolute -right-12 -top-14 h-44 w-64 rotate-[24deg] rounded-tl-[70%] rounded-br-[55%] bg-[radial-gradient(closest-side,rgba(255,255,255,0.22),rgba(255,255,255,0.05)_55%,transparent)] blur-2xl" />
      <div className="absolute -right-20 top-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute right-8 -top-6 h-16 w-40 rotate-[18deg] rounded-tr-[80%] bg-white/5 blur-xl" />

      {/* Bottom-left streak */}
      <div className="absolute -bottom-14 -left-12 h-44 w-64 -rotate-[20deg] rounded-br-[65%] rounded-tl-[55%] bg-[radial-gradient(closest-side,rgba(255,255,255,0.16),transparent_60%)] blur-2xl" />
      <div className="absolute -bottom-16 left-10 h-20 w-20 rounded-full bg-white/5 blur-2xl" />
      <div className="absolute bottom-4 -left-8 h-16 w-44 -rotate-[14deg] rounded-bl-[80%] bg-white/5 blur-xl" />
    </div>
  );
}

/** Shared near-black card shell at CR80 aspect ratio (85.6 x 53.98 mm). */
function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative aspect-[85.6/53.98] w-full max-w-[440px] overflow-hidden rounded-2xl bg-gradient-to-br from-[#0a0a0a] to-[#000000] shadow-[0_24px_60px_-18px_var(--rc-shadow)] ring-1 ring-white/10 [print-color-adjust:exact]"
      aria-hidden
    >
      <CardArtwork />
      {children}
    </div>
  );
}

/** A card face plus its small FRONT/BACK caption. */
function CardFace({
  label,
  children,
  caption,
}: {
  label: "FRONT" | "BACK";
  children: React.ReactNode;
  caption?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-roicard-text-muted">
        {label}
      </span>
      <CardShell>{children}</CardShell>
      {caption && (
        <span className="text-[11px] text-roicard-text-muted/70">{caption}</span>
      )}
    </div>
  );
}

function CardFront({ memberName }: { memberName: string }) {
  return (
    <div className="relative flex h-full flex-col justify-between p-5 sm:p-6" aria-hidden>
      {/* ROICARD logo — ROI/C/RD in white, A in gradient orange→red */}
      <p className="flex items-center text-xl font-extrabold uppercase tracking-[0.28em] text-white sm:text-[22px]">
        <span>ROI</span>
        <span>C</span>
        <span className="bg-[linear-gradient(90deg,#f97316,#ef4444)] bg-clip-text text-transparent">
          A
        </span>
        <span>RD</span>
      </p>

      {/* Member name */}
      <p className="truncate text-base font-medium uppercase tracking-[0.16em] text-white sm:text-lg">
        {memberName}
      </p>
    </div>
  );
}

function CardBack({
  qrCodeUrl,
  slug,
  cardNumber,
}: {
  qrCodeUrl: string;
  slug: string;
  cardNumber?: string;
}) {
  const [qrFailed, setQrFailed] = useState(false);

  return (
    <>
      <div className="relative flex h-full flex-col items-center justify-center gap-3.5 px-6 sm:gap-4" aria-hidden>
        {/* QR code in a white rounded container */}
        <div className="flex items-center justify-center rounded-2xl bg-white p-3 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.9)] sm:p-3.5">
          {qrFailed ? (
            <span className="flex h-24 w-24 items-center justify-center sm:h-28 sm:w-28">
              <QrCode className="h-10 w-10 text-neutral-300" aria-hidden />
            </span>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrCodeUrl}
              alt="QR code"
              width={96}
              height={96}
              className="h-24 w-24 sm:h-28 sm:w-28"
              onError={() => setQrFailed(true)}
            />
          )}
        </div>

        <p className="text-center text-xs font-bold uppercase tracking-[0.32em] text-white sm:text-sm">
          TAP. SCAN. CONNECT.
        </p>
      </div>

      {/* Reference metadata */}
      {slug && (
        <span className="absolute bottom-3 left-4 text-[9px] font-medium uppercase tracking-[0.2em] text-white/25">
          {slug}
        </span>
      )}
      {cardNumber && (
        <span className="absolute bottom-3 right-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
          {cardNumber}
        </span>
      )}
    </>
  );
}

export function CardPreview({
  memberName,
  qrCodeUrl,
  slug,
  cardNumber,
}: CardPreviewProps) {
  return (
    <div className="grid gap-10 md:grid-cols-2">
      <CardFace label="FRONT">
        <CardFront memberName={(memberName || "MEMBER NAME").toUpperCase()} />
      </CardFace>

      <CardFace label="BACK">
        <CardBack qrCodeUrl={qrCodeUrl} slug={slug} cardNumber={cardNumber} />
      </CardFace>
    </div>
  );
}