/**
 * Admin User Card Page
 *
 * Route: /admin/users/card/[id]
 * Printable business card (profile URL + QR code) for a specific user.
 */

import { UserCardView } from "@/components/admin/UserCardView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "User Card — Admin",
};

export default async function AdminUserCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <UserCardView userId={id} />;
}
