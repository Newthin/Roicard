/**
 * SecondaryActionButtons
 *
 * Secondary actions shown beneath the primary CTA: "Save Contact" (downloads a
 * vCard) and "WhatsApp" (opens a chat). When no WhatsApp handler is provided
 * (the member shared no number), "Save Contact" spans the full width.
 * Built on the shared Button component so styling stays consistent.
 */

"use client";

import { Button } from "@/components/ui/Button";
import { WhatsAppIcon } from "@/components/profile/public/BrandIcons";
import { Download } from "lucide-react";

type SecondaryActionButtonsProps = {
  onSaveContact: () => void;
  /** Optional — omit to hide the WhatsApp action. */
  onWhatsApp?: () => void;
};

export function SecondaryActionButtons({
  onSaveContact,
  onWhatsApp,
}: SecondaryActionButtonsProps) {
  return (
    <div className={onWhatsApp ? "grid grid-cols-2 gap-3" : "grid grid-cols-1"}>
      <Button
        variant="secondary"
        className="h-12 rounded-2xl"
        onClick={onSaveContact}
      >
        <Download className="h-4 w-4 text-roicard-accent" aria-hidden />
        Save Contact
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
    </div>
  );
}
