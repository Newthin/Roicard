import { MemberReferralDashboardView } from "@/components/member";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Referrals — Roicard",
};

export default function DashboardReferralsPage() {
  return <MemberReferralDashboardView />;
}
