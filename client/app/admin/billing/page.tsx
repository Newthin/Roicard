import { BillingManagementView } from "@/components/admin";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Billing — Admin",
};

export default function AdminBillingPage() {
  return <BillingManagementView />;
}
