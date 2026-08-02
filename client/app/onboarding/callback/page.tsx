/**
 * Payment callback — /onboarding/callback?reference=...
 *
 * Paystack redirects here after a card payment attempt. Reads the reference
 * from the query string, verifies the payment status against the backend,
 * and finalizes membership when successful.
 */

"use client";

import { Button } from "@/components/ui/Button";
import { getPaymentStatus } from "@/lib/api/payments";
import {
  clearPaymentSnapshot,
  createAndSaveProfile,
  getCurrentUserProfile,
  getPaymentSnapshot,
} from "@/lib/profile/storage";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

type CallbackState = "checking" | "success" | "failed" | "no_reference";

function PaymentCallbackContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference");
  const [state, setState] = useState<CallbackState>("checking");
  const runRef = useRef(false);

  useEffect(() => {
    if (runRef.current) return;
    runRef.current = true;

    if (!reference) {
      setState("no_reference");
      return;
    }

    (async () => {
      try {
        const { status } = await getPaymentStatus(reference);

        if (status === "success") {
          const snapshot = getPaymentSnapshot() ?? (await getCurrentProfile());
          if (snapshot) {
            createAndSaveProfile(snapshot);
          }
          clearPaymentSnapshot();
          setState("success");
        } else {
          setState("failed");
        }
      } catch {
        setState("failed");
      }
    })();
  }, [reference]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-5 py-16 text-center">
      {state === "checking" && (
        <>
          <Loader2 className="h-12 w-12 animate-spin text-roicard-accent" />
          <h1 className="text-xl font-semibold text-roicard-text">
            Verifying your payment
          </h1>
        </>
      )}

      {state === "success" && (
        <>
          <CheckCircle2 className="h-14 w-14 text-emerald-500" />
          <h1 className="text-xl font-semibold text-roicard-text">
            Payment successful!
          </h1>
          <p className="text-sm text-roicard-text-muted">
            Your ROICARD membership is active. Head to your dashboard to
            continue.
          </p>
          <Link href="/dashboard">
            <Button className="rounded-xl">Go to dashboard</Button>
          </Link>
        </>
      )}

      {state === "failed" && (
        <>
          <XCircle className="h-14 w-14 text-rose-500" />
          <h1 className="text-xl font-semibold text-roicard-text">
            Payment not confirmed
          </h1>
          <p className="text-sm text-roicard-text-muted">
            We couldn't confirm your payment. You can retry or check later from
            your dashboard.
          </p>
          <Link href="/onboarding">
            <Button variant="secondary" className="rounded-xl">
              Return to onboarding
            </Button>
          </Link>
        </>
      )}

      {state === "no_reference" && (
        <>
          <XCircle className="h-14 w-14 text-rose-500" />
          <h1 className="text-xl font-semibold text-roicard-text">
            No payment reference
          </h1>
          <p className="text-sm text-roicard-text-muted">
            We couldn't find a payment reference. Please try again.
          </p>
          <Link href="/onboarding">
            <Button className="rounded-xl">Back to onboarding</Button>
          </Link>
        </>
      )}
    </div>
  );
}

/** Resolve current profile for snapshot fallback when none was persisted. */
async function getCurrentProfile() {
  const profile = await getCurrentUserProfile();
  if (profile) {
    profile.membershipStatus = "active";
    return profile;
  }
  return null;
}

export default function PaymentCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-roicard-accent" />
        </div>
      }
    >
      <PaymentCallbackContent />
    </Suspense>
  );
}