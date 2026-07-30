/**
 * Admin Statistics Page
 *
 * Route: /admin/statistics
 * Platform-wide analytics with charts and date filters.
 */

import { AdminStatisticsView } from "@/components/admin";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Statistics — Admin",
};

export default function AdminStatisticsPage() {
  return <AdminStatisticsView />;
}
