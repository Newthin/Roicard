/**
 * Public landing page route — /
 *
 * ROICARD marketing homepage. First impression for prospects and visitors.
 */

import { LandingPage } from "@/components/landing";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ROICARD — You Belong Here.",
  description:
    "Africa's professional identity network. An identity that opens doors — shared through your Smart Card, QR code, or profile link.",
};

export default function HomePage() {
  return <LandingPage />;
}
