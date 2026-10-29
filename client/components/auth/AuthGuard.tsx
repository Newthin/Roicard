"use client";

import { useAuth } from "@/contexts/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";

type AuthGuardProps = {
  children: ReactNode;
};

/**
 * Routes the member using the server-resolved `next_step` — never the local
 * journey snapshot. This is what stops the old redirect loop where wiping
 * localStorage (or finishing onboarding on a new device) bounced a completed
 * member back into the journey forever.
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, user, logout } = useAuth();

  const isAdmin = user?.role === "admin";

  // Server-resolved step. Admins land on the dashboard too; the admin console
  // is reachable by role, not by `next_step`. The `admin` value is only kept
  // for sessions cached before this change.
  const rawNextStep =
    user?.next_step ??
    (user?.onboarding_completed === false ? "onboarding" : "dashboard");
  const nextStep =
    rawNextStep === "admin" || (rawNextStep === "onboarding" && isAdmin)
      ? "dashboard"
      : rawNextStep;

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace("/auth/login");
      return;
    }

    if (nextStep === "blocked") {
      logout();
      return;
    }

    if (nextStep === "onboarding" && !pathname?.startsWith("/onboarding")) {
      router.replace("/onboarding");
      return;
    }

    // A member must never see the admin console shell. Admins may open it
    // from the dashboard at any time.
    if (pathname?.startsWith("/admin") && !isAdmin) {
      router.replace(nextStep === "onboarding" ? "/onboarding" : "/dashboard");
    }
  }, [isAdmin, isAuthenticated, isLoading, logout, nextStep, pathname, router]);

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return null;
  }

  // Don't flash protected content while a redirect is in flight.
  if (nextStep === "blocked") return null;
  if (nextStep === "onboarding" && !pathname?.startsWith("/onboarding")) {
    return null;
  }
  if (pathname?.startsWith("/admin") && !isAdmin) {
    return null;
  }

  return <>{children}</>;
}
