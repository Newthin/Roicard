/**
 * Legacy onboarding route — /dashboard/onboarding
 *
 * The onboarding journey moved to the public top-level /onboarding route
 * (account creation now happens inside the flow). Redirect for old links.
 */

import { redirect } from "next/navigation";

export default function LegacyOnboardingPage() {
  redirect("/onboarding");
}
