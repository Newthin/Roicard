"use client";

import { useAuth } from "@/contexts/AuthContext";
import { destinationForUser } from "@/lib/authRouting";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";

/**
 * Keeps completed members and admins out of the onboarding journey. The
 * journey stays public for visitors who are not signed in yet.
 */
export function OnboardingGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();

  const destination =
    isAuthenticated && user
      ? destinationForUser(user)
      : null;

  // `destinationForUser` returns "/auth/login" for blocked accounts, which is
  // a real redirect target (unlike a signed-out visitor, who has no user and
  // therefore no destination).
  const shouldRedirect = !!destination && destination !== "/onboarding";

  useEffect(() => {
    if (isLoading || !shouldRedirect || !destination) return;
    router.replace(destination);
  }, [destination, isLoading, router, shouldRedirect]);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-roicard-border border-t-roicard-accent"
          aria-hidden
        />
      </div>
    );
  }

  if (shouldRedirect) return null;

  return <>{children}</>;
}
