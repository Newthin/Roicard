"use client";

import { Button } from "@/components/ui/Button";
import { verifyEmail } from "@/lib/api/auth";
import { CheckCircle2, Mail, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";

type VerifyEmailContentProps = {
  initialVerified?: boolean;
  initialInvalid?: boolean;
  email?: string;
};

export function VerifyEmailContent({
  initialVerified = false,
  initialInvalid = false,
  email = "",
}: VerifyEmailContentProps) {
  const router = useRouter();
  const [isResending, setIsResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleResend = async () => {
    setIsResending(true);
    setResent(false);

    try {
      await verifyEmail(email);
      setResent(true);
    } catch {
      setResent(false);
    }
    setIsResending(false);
  };

  if (initialVerified) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/30">
          <CheckCircle2 className="h-8 w-8 text-emerald-400" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-roicard-text">Email verified</h2>
          <p className="text-sm leading-relaxed text-roicard-text-muted">
            Your account is now active. You&apos;re all set to build your
            ROICARD profile and start connecting.
          </p>
        </div>

        <Link
          href="/auth/login"
          className="flex h-12 w-full items-center justify-center rounded-xl bg-roicard-primary text-sm font-medium text-roicard-on-primary transition-colors hover:bg-roicard-primary-hover"
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-center">
      <div
        className={cn(
          "mx-auto flex h-16 w-16 items-center justify-center rounded-full",
          "bg-roicard-primary/15 ring-1 ring-roicard-primary/25"
        )}
      >
        <Mail className="h-8 w-8 text-roicard-accent" />
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-roicard-text">
          {initialInvalid ? "Request a new link" : "Verification pending"}
        </h2>
        <p className="text-sm leading-relaxed text-roicard-text-muted">
          {initialInvalid
            ? "Click below to send a fresh verification link to your email."
            : email
              ? <>We sent a verification link to <span className="font-medium text-roicard-text">{email}</span>. Click the link to activate your account — it expires in 24 hours.</>
              : "We sent a verification link to your email. Click the link to activate your account — it expires in 24 hours."}
        </p>
      </div>

      {resent && (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          Verification email sent! Check your inbox.
        </p>
      )}

      {!email && (
        <div className="space-y-3">
          <Button
            variant="secondary"
            fullWidth
            isLoading={isResending}
            className="h-12 rounded-xl"
            onClick={() => router.push("/auth/login")}
          >
            Sign in
          </Button>
        </div>
      )}

      {email && (
        <Button
          variant="secondary"
          fullWidth
          isLoading={isResending}
          className="h-12 rounded-xl"
          onClick={handleResend}
        >
          {!isResending && <RefreshCw className="h-4 w-4" />}
          Resend Verification Email
        </Button>
      )}
    </div>
  );
}
