import { ExecutiveReferralDashboardView } from "@/components/executive";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Referral network — Executive",
};

export default function ExecutiveReferralsPage() {
  return <ExecutiveReferralDashboardView />;
}
