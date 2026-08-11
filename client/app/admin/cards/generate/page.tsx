/**
 * Admin Generate Card Page
 *
 * Route: /admin/cards/generate
 * Live preview of the physical NFC card artwork for a selected member.
 * Picks a member, previews the front + back faces, and shows the QR that
 * will be printed on the card.
 */

"use client";

import { CardPreview } from "@/components/admin/CardPreview";
import { useAdmin } from "@/components/admin/AdminProvider";
import { Info } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

const inputClass =
  "h-11 w-full rounded-lg border border-roicard-border bg-roicard-bg-muted px-4 text-sm text-roicard-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-roicard-accent/50 focus-visible:border-roicard-accent/50";

export default function AdminGenerateCardPage() {
  const { users, isLoading } = useAdmin();

  const onboardedUsers = useMemo(
    () => users.filter((u) => u.username),
    [users]
  );

  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [cardNumber, setCardNumber] = useState("");
  const [qrOverride, setQrOverride] = useState("");

  const selectedUser = onboardedUsers.find((u) => u.id === selectedUserId);

  // Move selection to the first onboarded member once data arrives.
  useEffect(() => {
    if (!selectedUserId && onboardedUsers.length > 0) {
      setSelectedUserId(onboardedUsers[0].id);
    }
  }, [onboardedUsers, selectedUserId]);

  const slug = selectedUser?.username ?? "";
  const memberName = selectedUser
    ? `${selectedUser.firstName} ${selectedUser.lastName}`.trim()
    : "";
  const defaultQrUrl = slug ? `${apiBase}/qr/image/${encodeURIComponent(slug)}` : "";

  return (
    <div className="space-y-6">
      <header>
        <span className="inline-flex w-fit rounded-full bg-roicard-primary/15 px-3 py-1 text-xs font-medium text-roicard-accent">
          Roicard
        </span>
        <h1 className="mt-3 text-2xl font-bold text-roicard-text sm:text-3xl">
          Generate Card
        </h1>
        <p className="mt-2 text-sm text-roicard-text-muted">
          Preview the physical NFC card artwork before printing and shipping.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Card details */}
        <section className="space-y-4 rounded-2xl border border-roicard-border bg-roicard-bg-elevated p-5">
          <h2 className="text-sm font-semibold text-roicard-text">
            Card Details
          </h2>

          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-roicard-border border-t-roicard-primary" />
            </div>
          ) : onboardedUsers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-roicard-border p-4 text-sm text-roicard-text-muted">
              No members have completed onboarding yet. A card can be generated
              once a member has a public profile URL.
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <label
                  htmlFor="member"
                  className="text-xs font-medium text-roicard-text-muted"
                >
                  Member
                </label>
                <select
                  id="member"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className={inputClass}
                >
                  {onboardedUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName} ({u.username})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="card-number"
                  className="text-xs font-medium text-roicard-text-muted"
                >
                  Card number (optional)
                </label>
                <input
                  id="card-number"
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="e.g. NFC-ROIC-0001"
                  className={inputClass}
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="qr-url"
                  className="text-xs font-medium text-roicard-text-muted"
                >
                  QR code URL
                </label>
                <input
                  id="qr-url"
                  type="text"
                  value={qrOverride}
                  onChange={(e) => setQrOverride(e.target.value)}
                  placeholder={defaultQrUrl || "No QR URL yet"}
                  className={inputClass}
                />
              </div>

              <div className="flex items-start gap-2 rounded-lg bg-roicard-bg-muted/60 p-3 text-xs leading-relaxed text-roicard-text-muted">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-roicard-accent" />
                <span>
                  The QR is fetched from the backend at{" "}
                  <code className="break-all text-roicard-text">
                    {apiBase}/qr/image/&#123;slug&#125;
                  </code>
                  . Leave the URL empty to use the member&apos;s default QR.
                </span>
              </div>
            </>
          )}
        </section>

        {/* Card preview */}
        <section className="rounded-2xl border border-roicard-border bg-roicard-bg-elevated p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-roicard-text">Preview</h2>
          <p className="mt-1 text-sm text-roicard-text-muted">
            Physical card size 85.6 × 53.98 mm (CR80).
          </p>

          <div className="mt-6">
            {selectedUser ? (
              <CardPreview
                memberName={memberName}
                qrCodeUrl={qrOverride.trim() || defaultQrUrl}
                slug={slug}
                cardNumber={cardNumber.trim() || undefined}
              />
            ) : (
              <div className="rounded-xl border border-dashed border-roicard-border p-10 text-center text-sm text-roicard-text-muted">
                Select a member to preview their card.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
