"use client";

import { useAuth } from "@/contexts/AuthContext";
import { getJourneyState, isOnboardingComplete } from "@/lib/profile/storage";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";

type AuthGuardProps = {
  children: ReactNode;
};

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace("/auth/login");
      return;
    }

    // The server is the source of truth for onboarding completion. A member
    // who already finished onboarding must never be routed back into it even
    // if local journey state was wiped on a previous logout.
    if (user?.onboarding_completed) return;

    // A journey still in progress means onboarding isn't finished — send the
    // member back to resume it instead of letting them into the dashboard.
    if (getJourneyState() && !isOnboardingComplete()) {
      router.replace("/onboarding");
    }
  }, [isAuthenticated, isLoading, router, user?.onboarding_completed]);

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
