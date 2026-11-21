import { ExecutivesManagementView } from "@/components/admin";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Executives — Admin",
};

export default function AdminExecutivesPage() {
  return <ExecutivesManagementView />;
}
