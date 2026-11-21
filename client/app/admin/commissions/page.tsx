import { CommissionsManagementView } from "@/components/admin";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Commissions — Admin",
};

export default function AdminCommissionsPage() {
  return <CommissionsManagementView />;
}
