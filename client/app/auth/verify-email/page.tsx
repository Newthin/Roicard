"use client";

import { AuthFooterLink, AuthPageLayout, VerifyEmailContent } from "@/components/auth";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const isVerified = searchParams.get("verified") === "true";

  return (
    <AuthPageLayout
      title={isVerified ? "You're all set" : "Verify your email"}
      subtitle={
        isVerified
          ? "Your email has been confirmed successfully"
          : "We've sent a verification link to your inbox"
      }
      footer={<AuthFooterLink text="Already verified?" linkText="Sign in" href="/auth/login" />}
    >
      <VerifyEmailContent initialVerified={isVerified} />
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
