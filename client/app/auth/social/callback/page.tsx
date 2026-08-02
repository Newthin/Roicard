import { AuthFooterLink, AuthPageLayout, SocialCallbackContentPage } from "@/components/auth";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
};

export default function SocialCallbackPage() {
  return (
    <AuthPageLayout
      title="Signing you in"
      subtitle="Just a moment while we connect your account"
      footer={<AuthFooterLink text="Prefer email?" linkText="Sign in instead" href="/auth/login" />}
    >
      <SocialCallbackContentPage />
    </AuthPageLayout>
  );
}