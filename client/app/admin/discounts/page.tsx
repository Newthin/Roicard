import { DiscountsManagementView } from "@/components/admin";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Discounts — Admin",
};

export default function AdminDiscountsPage() {
  return <DiscountsManagementView />;
}
