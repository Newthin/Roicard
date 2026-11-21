import { PricingView } from "@/components/pricing/PricingView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Start free, or unlock the physical Roicard card, meeting booking, analytics and the full Roicard toolkit.",
};

export default function PricingPage() {
  return <PricingView />;
}
