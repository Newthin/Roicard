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

  // Fallback for sessions cached before `next_step` existed.
  const nextStep =
    user?.next_step ??
    (user?.role === "admin"
      ? "admin"
      : user?.onboarding_completed === false
        ? "onboarding"
        : "dashboard");

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

    if (nextStep === "admin" && !pathname?.startsWith("/admin")) {
      router.replace("/admin");
      return;
    }

    // A member must never see the admin console shell.
    if (pathname?.startsWith("/admin") && nextStep !== "admin") {
      router.replace(nextStep === "onboarding" ? "/onboarding" : "/dashboard");
    }
  }, [isAuthenticated, isLoading, logout, nextStep, pathname, router]);

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
  if (nextStep === "admin" && !pathname?.startsWith("/admin")) {
    return null;
  }
  if (pathname?.startsWith("/admin") && nextStep !== "admin") {
    return null;
  }

  return <>{children}</>;
}
