import {
  AuthFooterLink,
  AuthPageLayout,
  RegisterForm,
} from "@/components/auth";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Become a Member",
};

export default function RegisterPage() {
  return (
    <AuthPageLayout
      title="Become a member"
      subtitle="Create your account to join the Roicard community"
      footer={
        <AuthFooterLink
          text="Already have an account?"
          linkText="Sign in"
          href="/auth/login"
        />
      }
    >
      <RegisterForm />
    </AuthPageLayout>
  );
}
