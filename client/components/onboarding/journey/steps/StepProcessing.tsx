/**
 * Step 11 — Processing
 *
 * Polls the REAL payment status. Activation only happens when the backend
 * reports the payment as successful; this step never marks a membership active
 * on its own. If the status stays pending, the member can retry or skip —
 * payment is optional and never blocks dashboard access once onboarding ends.
 */

"use client";

import { useJourney } from "@/components/onboarding/journey/JourneyContext";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import {
  clearRememberedPaymentReference,
  getPaymentStatus,
  getRememberedPaymentReference,
} from "@/lib/api/payments";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const MAX_ATTEMPTS = 15;
const POLL_INTERVAL_MS = 2000;

export function StepProcessing() {
  const { user, refreshUser } = useAuth();
  const { finishProcessing, skipMembership } = useJourney();
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    setError(null);

    // Already active (e.g. resumed session) — no need to poll.
    if (user?.status === "active") {
      finishProcessing();
      return;
    }

    const reference = getRememberedPaymentReference();

    if (!reference) {
      setError(
        "We couldn't find a payment to confirm. You can retry from your dashboard or skip for now."
      );
      return;
    }

    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async (attempt: number) => {
      if (cancelledRef.current) return;

      try {
        const { status } = await getPaymentStatus(reference);

        if (cancelledRef.current) return;

        if (status === "success") {
          clearRememberedPaymentReference();
          // Refresh the session so the header/dashboard see the active status.
          try {
            await refreshUser();
          } catch {
            // Non-fatal: activation already happened server-side.
          }
          if (!cancelledRef.current) finishProcessing();
          return;
        }

        if (status === "failed") {
          setError(
            "Your payment was not completed. You can try again or skip for now — your profile stays saved."
          );
          return;
        }
      } catch {
        // Transient errors: keep polling within the window.
      }

      if (attempt < MAX_ATTEMPTS) {
        timer = setTimeout(() => poll(attempt + 1), POLL_INTERVAL_MS);
      } else {
        setError(
          "We're still waiting for confirmation from the payment provider. You can check again shortly or skip for now."
        );
      }
    };

    poll(1);

    return () => {
      cancelledRef.current = true;
      if (timer) clearTimeout(timer);
    };
  }, [finishProcessing, refreshUser, retryCount, user?.status]);

  return (
    <div className="flex flex-col items-center gap-5 py-12 text-center">
      {error ? (
        <>
          <h1 className="text-xl font-semibold text-roicard-text">
            Payment not confirmed yet
          </h1>
          <p className="max-w-sm text-sm text-roicard-text-muted">{error}</p>
          <div className="flex w-full max-w-xs flex-col gap-3">
            <Button
              onClick={() => setRetryCount((count) => count + 1)}
              className="w-full rounded-xl"
            >
              Check again
            </Button>
            <Button
              variant="secondary"
              onClick={skipMembership}
              className="w-full rounded-xl"
            >
              Skip for now
            </Button>
          </div>
        </>
      ) : (
        <>
          <Loader2 className="h-12 w-12 animate-spin text-roicard-accent" />
          <h1 className="text-xl font-semibold text-roicard-text">
            Processing your payment...
          </h1>
          <p className="max-w-sm text-sm text-roicard-text-muted">
            Please wait while we confirm your membership activation. This will
            only take a moment.
          </p>
        </>
      )}
    </div>
  );
}
