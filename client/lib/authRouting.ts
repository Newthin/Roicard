import type { AuthUser } from "@/lib/api/auth";

type RoutingUser = Pick<
  AuthUser,
  "next_step" | "role" | "onboarding_completed"
>;

/**
 * Single client-side mapping from the server's `next_step` to a route.
 * `fallback` is used only when the member is cleared for the dashboard (e.g.
 * honouring a `?next=` deep link after sign-in).
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
      return "/onboarding";
    case "admin":
      return "/admin";
    case "dashboard":
      return fallback;
    default:
      break;
  }

  // Sessions cached before `next_step` existed.
  if (user.role === "admin") return "/admin";
  if (user.onboarding_completed === false) return "/onboarding";

  return fallback;
}
