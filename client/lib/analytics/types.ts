/**
 * Analytics type definitions.
 *
 * Separates data shapes from UI for future API integration.
 */

/** Date range filter options for the analytics dashboard. */
export type AnalyticsDateRange = "7d" | "30d" | "90d" | "all";

/** Single metric with current value and period-over-period change. */
export type AnalyticsMetric = {
  key: string;
  label: string;
  value: number;
  changePercent: number;
  trend: "up" | "down" | "neutral";
};

/** Time-series data point for charts. */
export type AnalyticsChartPoint = {
  date: string;
  label: string;
  value: number;
};

/** High-level overview summary cards. */
export type AnalyticsOverview = {
  totalReach: number;
  engagementSummary: string;
  mostActivePeriod: string;
};

/** Activity timeline event types. */
export type ActivityType =
  | "profile_view"
  | "qr_scan"
  | "nfc_tap"
  | "connection_request"
  | "connection_accepted";

export type ActivityEvent = {
  id: string;
  type: ActivityType;
  timestamp: string;
  userName?: string;
  description: string;
};

/** Full analytics payload for a given date range. */
export type AnalyticsData = {
  metrics: AnalyticsMetric[];
  overview: AnalyticsOverview;
  profileViewsChart: AnalyticsChartPoint[];
  qrScansChart: AnalyticsChartPoint[];
  connectionRequestsChart: AnalyticsChartPoint[];
  activities: ActivityEvent[];
  hasData: boolean;
};
