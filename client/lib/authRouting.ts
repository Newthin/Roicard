import type { AuthUser } from "@/lib/api/auth";

type RoutingUser = Pick<
  AuthUser,
  "next_step" | "role" | "onboarding_completed"
>;

/**
 * Single client-side mapping from the server's `next_step` to a route.
 * `fallback` is used only when the member is cleared for the dashboard (e.g.
 * honouring a `?next=` deep link after sign-in).
 *
 * Admins default to the dashboard as well; the admin console is reached by
 * role (`/admin`), not by routing.
 */
export function destinationForUser(
  user: RoutingUser | null | undefined,
  fallback = "/dashboard"
): string {
  if (!user) return "/auth/login";

  switch (user.next_step) {
    case "blocked":
      return "/auth/login";
    case "onboarding":
      return user.role === "admin" ? fallback : "/onboarding";
    // Legacy value from sessions cached before admins were moved to the
    // dashboard.
    case "admin":
      return fallback;
    case "dashboard":
      return fallback;
    default:
      break;
  }

  // Sessions cached before `next_step` existed.
  if (user.onboarding_completed === false && user.role !== "admin") {
    return "/onboarding";
  }

  return fallback;
}
