"use client";

import { AuthFooterLink, AuthPageLayout, VerifyEmailContent } from "@/components/auth";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const isVerified = searchParams.get("verified") === "true";
  const isInvalid = searchParams.get("verified") === "invalid";
  const email = searchParams.get("email") ?? "";

  const title = isVerified ? "You're all set" : isInvalid ? "Link invalid or expired" : "Verify your email";
  const subtitle = isVerified
    ? "Your email has been confirmed successfully"
    : isInvalid
      ? "This verification link is invalid or has expired. Request a new one."
      : "We've sent a verification link to your inbox";

  return (
    <AuthPageLayout
      title={title}
      subtitle={subtitle}
      footer={<AuthFooterLink text="Already verified?" linkText="Sign in" href="/auth/login" />}
    >
      <VerifyEmailContent initialVerified={isVerified} initialInvalid={isInvalid} email={email} />
    </AuthPageLayout>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailInner />
    </Suspense>
  );
}
