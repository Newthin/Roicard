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
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace("/auth/login");
      return;
    }

    // A journey still in progress means onboarding isn't finished — send the
    // member back to resume it instead of letting them into the dashboard.
    if (getJourneyState() && !isOnboardingComplete()) {
      router.replace("/onboarding");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
