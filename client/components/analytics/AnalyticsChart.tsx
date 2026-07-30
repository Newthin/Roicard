/**
 * AnalyticsChart
 *
 * Responsive Recharts area chart — theme-aware via CSS variable tokens.
 */

"use client";

import { useChartTheme } from "@/hooks/useChartTheme";
import type { AnalyticsChartPoint } from "@/lib/analytics/types";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type AnalyticsChartProps = {
  title: string;
  data: AnalyticsChartPoint[];
  color?: string;
  gradientId: string;
};

/** Theme-aware tooltip for chart hover states. */
function ChartTooltip({
  active,
  payload,
  label,
  tokens,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  tokens: ReturnType<typeof useChartTheme>;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div
      className="rounded-lg border px-3 py-2 shadow-xl theme-transition"
      style={{
        backgroundColor: tokens.tooltipBg,
        borderColor: tokens.tooltipBorder,
      }}
    >
      <p className="text-xs text-roicard-text-muted">{label}</p>
      <p className="text-sm font-semibold text-roicard-text">
        {payload[0].value.toLocaleString()}
      </p>
    </div>
  );
}

export function AnalyticsChart({
  title,
  data,
  color = "#E63946",
  gradientId,
}: AnalyticsChartProps) {
  const chartTheme = useChartTheme();

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-6 theme-transition">
      <h3 className="mb-4 text-sm font-semibold text-roicard-text">{title}</h3>
      <div className="h-56 w-full sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={chartTheme.grid}
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fill: chartTheme.tick, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: chartTheme.tick, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip content={<ChartTooltip tokens={chartTheme} />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              animationDuration={800}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
