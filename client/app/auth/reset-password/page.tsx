import {
  AuthFooterLink,
  AuthPageLayout,
  ResetPasswordForm,
} from "@/components/auth";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Reset Password",
};

export default function ResetPasswordPage() {
  return (
    <AuthPageLayout
      title="Set a new password"
      subtitle="Choose a strong password for your account"
      footer={
        <AuthFooterLink
          text="Done resetting?"
          linkText="Sign in"
          href="/auth/login"
        />
      }
    >
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </AuthPageLayout>
  );
}
