/**
 * Public landing page route — /
 *
 * ROICARD marketing homepage. First impression for prospects and visitors.
 */

import { LandingPage } from "@/components/landing";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ROICARD — Your Identity. One Link. Endless Opportunities.",
  description:
    "Create your professional identity, share it instantly via QR and NFC, and grow your network with ROICARD.",
};

export default function HomePage() {
  return <LandingPage />;
}
