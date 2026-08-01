import { AuthFooterLink, AuthPageLayout, GoogleCallbackContentPage } from "@/components/auth";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Google Sign-In",
};

export default function GoogleCallbackPage() {
  return (
    <AuthPageLayout
      title="Signing you in"
      subtitle="Just a moment while we connect your Google account"
      footer={<AuthFooterLink text="Prefer email?" linkText="Sign in instead" href="/auth/login" />}
    >
      <GoogleCallbackContentPage />
    </AuthPageLayout>
  );
}
