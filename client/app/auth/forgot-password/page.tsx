import {
  AuthFooterLink,
  AuthPageLayout,
  ForgotPasswordForm,
} from "@/components/auth";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forgot Password",
};

export default function ForgotPasswordPage() {
  return (
    <AuthPageLayout
      title="Reset your password"
      subtitle="Enter your email and we'll send you a reset link"
      footer={
        <AuthFooterLink
          text="Remember your password?"
          linkText="Back to login"
          href="/auth/login"
        />
      }
    >
      <ForgotPasswordForm />
    </AuthPageLayout>
  );
}
