/**
 * Analytics Dashboard Page
 *
 * Route: /dashboard/analytics
 * Displays user profile performance metrics and networking activity.
 */

import { AnalyticsDashboardView } from "@/components/analytics";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analytics",
};

export default function AnalyticsPage() {
  return <AnalyticsDashboardView />;
}
