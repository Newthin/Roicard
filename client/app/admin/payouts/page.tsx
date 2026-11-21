import { PayoutsManagementView } from "@/components/admin";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Payouts — Admin",
};

export default function AdminPayoutsPage() {
  return <PayoutsManagementView />;
}
