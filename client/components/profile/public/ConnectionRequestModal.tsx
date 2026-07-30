/**
 * ConnectionRequestModal
 *
 * Guest user flow for sending a connection request to a profile owner.
 * Collects name, email, phone, and organization — UI only until backend.
 *
 * Props:
 * - isOpen: controls modal visibility
 * - onClose: cancel / dismiss handler
 * - onSubmit: called with form data on successful submit
 * - profileName: name of the profile being connected to (for context)
 *
 * States: form → success message after submit.
 */

"use client";

import { FormField } from "@/components/onboarding/FormField";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { ConnectionRequestData } from "@/lib/profile/types";
import { CheckCircle2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

type ConnectionRequestModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ConnectionRequestData) => void;
  profileName: string;
};

const EMPTY_FORM: ConnectionRequestData = {
  name: "",
  email: "",
  phone: "",
  organization: "",
  meetingContext: "",
};

/**
 * URL params that may carry meeting context from an NFC tap or QR scan,
 * e.g. /jane?met=DevFest%20Accra or /jane?event=NFC%20tap%20at%20booth%2012.
 */
const MEETING_PARAM_KEYS = [
  "met",
  "meetingContext",
  "context",
  "event",
  "location",
  "via",
  "source",
];

/** Reads the first available meeting-context value from the current URL. */
function readMeetingContextFromUrl(): string {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  for (const key of MEETING_PARAM_KEYS) {
    const value = params.get(key);
    if (value && value.trim()) return value.trim();
  }
  return "";
}

export function ConnectionRequestModal({
  isOpen,
  onClose,
  onSubmit,
  profileName,
}: ConnectionRequestModalProps) {
  const [form, setForm] = useState<ConnectionRequestData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<ConnectionRequestData>>({});
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Smart pre-fill: when the modal opens, seed "Where did you meet?" from any
   * NFC/QR URL params — but only if the user hasn't already typed something,
   * so their edits are never overwritten.
   */
  useEffect(() => {
    if (!isOpen) return;
    const context = readMeetingContextFromUrl();
    if (!context) return;
    setForm((prev) =>
      prev.meetingContext ? prev : { ...prev, meetingContext: context }
    );
  }, [isOpen]);

  /** Resets modal state when closed. */
  const handleClose = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setIsSuccess(false);
    onClose();
  };

  /** Basic frontend validation before mock submit. */
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: Partial<ConnectionRequestData> = {};
    if (!form.name.trim()) nextErrors.name = "Name is required";
    if (!form.email.trim()) nextErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      nextErrors.email = "Enter a valid email";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsLoading(true);

    // Mock API delay — replace with real endpoint
    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
      onSubmit(form);
    }, 600);
  };

  if (isSuccess) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Request sent"
        className="max-w-md"
      >
        <div className="space-y-4 py-2 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          </div>
          <p className="text-sm leading-relaxed text-roicard-text-muted">
            Connection request sent successfully. {profileName} will be notified
            of your request.
          </p>
          <Button fullWidth className="rounded-xl" onClick={handleClose}>
            Done
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Connect with ${profileName}`}
      description="Send a connection request to start building your professional network."
      className="max-w-md"
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <FormField
          label="Your Name"
          name="name"
          placeholder="Jane Smith"
          value={form.name}
          onChange={(e) => {
            setForm((prev) => ({ ...prev, name: e.target.value }));
            setErrors((prev) => ({ ...prev, name: undefined }));
          }}
          error={errors.name}
        />

        <FormField
          label="Email"
          type="email"
          name="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={(e) => {
            setForm((prev) => ({ ...prev, email: e.target.value }));
            setErrors((prev) => ({ ...prev, email: undefined }));
          }}
          error={errors.email}
        />

        <FormField
          label="Phone"
          type="tel"
          name="phone"
          placeholder="+1 (555) 000-0000"
          hint="Optional"
          value={form.phone}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, phone: e.target.value }))
          }
        />

        <FormField
          label="Organization"
          name="organization"
          placeholder="Your company"
          hint="Optional"
          value={form.organization}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, organization: e.target.value }))
          }
        />

        <FormField
          label="Where did you meet? (Optional)"
          name="meetingContext"
          placeholder="e.g., Tech Conference, Roicard tap, Coffee shop, Mutual friend..."
          hint="Helps you both remember this connection later."
          value={form.meetingContext ?? ""}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, meetingContext: e.target.value }))
          }
        />

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            fullWidth
            className="rounded-xl"
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            fullWidth
            isLoading={isLoading}
            className="rounded-xl"
          >
            Submit Request
          </Button>
        </div>
      </form>
    </Modal>
  );
}
