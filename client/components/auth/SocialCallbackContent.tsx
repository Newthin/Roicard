"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function SocialCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSession } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");
    const rawUser = searchParams.get("user");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      setError(
        errorParam === "provider_not_configured"
          ? "This sign-in option isn't set up yet. Please use email or Google."
          : "Sign-in could not be completed. Please try again."
      );
      return;
    }

    if (!token || !rawUser) {
      setError("Invalid sign-in response. Please try again.");
      return;
    }

    try {
      const user = JSON.parse(rawUser);
      setSession(token, user);
      // Brand-new social sign-ins (status "draft") still need to complete
      // onboarding; existing members go straight to the dashboard.
      router.replace(user?.status === "draft" ? "/onboarding" : "/dashboard");
    } catch {
      setError("Could not complete sign-in. Please try again.");
    }
  }, [router, searchParams, setSession]);

  if (error) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-red-500">{error}</p>
        <button
          type="button"
          onClick={() => router.replace("/auth/login")}
          className="text-sm font-medium text-roicard-accent transition-colors hover:text-roicard-text"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-center">
      <div
        className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-roicard-border border-t-roicard-accent"
        aria-hidden
      />
      <p className="text-sm text-roicard-text-muted">Completing sign-in…</p>
    </div>
  );
}

export function SocialCallbackContentPage() {
  return (
    <Suspense>
      <SocialCallbackContent />
    </Suspense>
  );
}