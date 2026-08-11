/**
 * ConnectionRequestModal
 *
 * Premium multi-step connect flow for a guest viewing a public profile:
 *   1. Contact details
 *   2. Introduce yourself
 *   3. Connection intent
 *   4. Submit → success
 *   5. Dismissible "Join Roicard" invitation
 *
 * Each step is optional-feeling: only name/email are required, intro and intent
 * are encouraged for context. Posts to the real connections API.
 */

"use client";

import { FormField } from "@/components/onboarding/FormField";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { GuestInviteCard } from "@/components/profile/public/GuestInviteCard";
import type { ConnectionRequestData } from "@/lib/profile/types";
import { CheckCircle2, HandHeart, Sparkles } from "lucide-react";
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
  introduction: "",
  intent: "",
};

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
  const [step, setStep] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
    setStep(1);
    setIsSuccess(false);
    onClose();
  };

  /** Validates the current step and advances. */
  const handleContinue = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (step === 1) {
      const nextErrors: Partial<ConnectionRequestData> = {};
      if (!form.name.trim()) nextErrors.name = "Your name is required";
      if (!form.email.trim()) nextErrors.email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        nextErrors.email = "Enter a valid email";
      }
      if (Object.keys(nextErrors).length > 0) {
        setErrors(nextErrors);
        return;
      }
      setErrors({});
      setStep(2);
      return;
    }

    if (step === 2) {
      setStep(3);
      return;
    }

    // Final submit
    setIsLoading(true);
    onSubmit(form);
    setIsLoading(false);
    setIsSuccess(true);
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
            Request sent successfully. {profileName} will be notified of your
            request along with your introduction.
          </p>

          <div className="space-y-3 pt-3 text-left">
            <GuestInviteCard name={profileName} onDismiss={handleClose} />
          </div>

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
      description="Introduce yourself, state why you're connecting, and send your request."
      className="max-w-md"
    >
      <div className="mb-4 flex items-center gap-2" role="tablist" aria-label="Connect steps">
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            role="tab"
            aria-selected={step === n}
            className={
              "h-1.5 flex-1 rounded-full transition-colors " +
              (step >= n ? "roicard-gradient" : "bg-roicard-bg-muted")
            }
          />
        ))}
      </div>

      <form className="space-y-4" onSubmit={handleContinue} noValidate>
        {step === 1 && (
          <>
            <div className="flex items-center gap-2 text-sm font-semibold text-roicard-text">
              <Sparkles className="h-4 w-4 text-roicard-accent" aria-hidden />
              Your details
            </div>
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
              value={form.meetingContext ?? ""}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, meetingContext: e.target.value }))
              }
            />
          </>
        )}

        {step === 2 && (
          <>
            <FormField
              label={`Tell ${profileName} a little about yourself`}
              name="introduction"
              variant="textarea"
              placeholder="Your role, what you're currently working on, or anything that gives context about who you are."
              hint="Optional, but a short intro helps them remember you."
              rows={4}
              value={form.introduction ?? ""}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, introduction: e.target.value }))
              }
            />
          </>
        )}

        {step === 3 && (
          <>
            <div className="flex items-center gap-2 text-sm font-semibold text-roicard-text">
              <HandHeart className="h-4 w-4 text-roicard-accent" aria-hidden />
              Why are you connecting?
            </div>
            <FormField
              label={`Why are you connecting with ${profileName}?`}
              name="intent"
              variant="textarea"
              placeholder="e.g., mutual opportunities, collaboration ideas, growing my network in Ghana..."
              hint="Optional — share your genuine reason for reaching out."
              rows={4}
              value={form.intent ?? ""}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, intent: e.target.value }))
              }
            />
          </>
        )}

        <div className="flex gap-3 pt-2">
          {step > 1 && (
            <Button
              type="button"
              variant="secondary"
              fullWidth
              className="rounded-xl"
              onClick={() => setStep((s) => s - 1)}
            >
              Back
            </Button>
          )}
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
            {step < 3 ? "Continue" : "Submit Request"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}