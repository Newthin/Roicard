/**
 * Admin Messages Page
 *
 * Route: /admin/messages
 * Manual service notices and draft nudges to selected members.
 */

import { MessagesManagementView } from "@/components/admin";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Messages — Admin",
};

export default function AdminMessagesPage() {
  return <MessagesManagementView />;
}
