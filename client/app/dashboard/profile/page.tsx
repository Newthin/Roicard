/**
 * Dashboard Profile Page
 *
 * Route: /dashboard/profile
 * Profile command center — preview, QR, public link, and completeness.
 */

import { ProfileHubView } from "@/components/profile/ProfileHubView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile",
};

export default function ProfilePage() {
  return <ProfileHubView />;
}
