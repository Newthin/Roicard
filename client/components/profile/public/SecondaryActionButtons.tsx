/**
 * SecondaryActionButtons
 *
 * Secondary actions shown beneath the primary CTA: "Add Contact" (downloads a
 * vCard), "WhatsApp" (opens a chat), and optionally "Schedule Meeting".
 * Built on the shared Button component so styling stays consistent.
 */

"use client";

import { Button } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/profile/public/BrandIcons";
import { Calendar, Download } from "lucide-react";

type SecondaryActionButtonsProps = {
  onSaveContact: () => void;
  /** Optional — omit to hide the WhatsApp action. */
  onWhatsApp?: () => void;
  /** Optional — omit to hide the Schedule Meeting action. */
  onScheduleMeeting?: () => void;
};

export function SecondaryActionButtons({
  onSaveContact,
  onWhatsApp,
  onScheduleMeeting,
}: SecondaryActionButtonsProps) {
  const actionCount = [true, !!onWhatsApp, !!onScheduleMeeting].filter(Boolean).length;
  const gridClass = actionCount === 1 ? "grid grid-cols-1" : actionCount === 2 ? "grid grid-cols-2 gap-3" : "grid grid-cols-2 gap-3";

  return (
    <div className={gridClass}>
      <Button
        variant="secondary"
        className="h-12 rounded-2xl"
        onClick={onSaveContact}
      >
        <Download className="h-4 w-4 text-roicard-accent" aria-hidden />
        Add Contact
      </Button>

      {onWhatsApp && (
        <Button
          variant="secondary"
          className="h-12 rounded-2xl"
          onClick={onWhatsApp}
        >
          <WhatsAppIcon className="h-[18px] w-[18px] text-emerald-500" aria-hidden />
          WhatsApp
        </Button>
      )}

      {onScheduleMeeting && (
        <Button
          variant="secondary"
          className="h-12 rounded-2xl col-span-2 sm:col-span-1"
          onClick={onScheduleMeeting}
        >
          <Calendar className="h-4 w-4 text-roicard-primary" aria-hidden />
          Schedule Meeting
        </Button>
      )}
    </div>
  );
}
