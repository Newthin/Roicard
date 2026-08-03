import {
  AuthFooterLink,
  AuthPageLayout,
  LoginForm,
} from "@/components/auth";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Login",
};

export default function LoginPage() {
  return (
    <AuthPageLayout
      title="Welcome back"
      subtitle="Sign in to your ROICARD account"
      footer={
        <AuthFooterLink
          text="Don't have an account?"
          linkText="Become a member"
          href="/auth/register"
        />
      }
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthPageLayout>
  );
}
