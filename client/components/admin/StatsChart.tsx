/**
 * StatsChart
 *
 * Bar chart for admin platform statistics — theme-aware styling.
 */

"use client";

import { useChartTheme } from "@/hooks/useChartTheme";
import type { AdminChartPoint } from "@/lib/admin/types";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type StatsChartProps = {
  title: string;
  data: AdminChartPoint[];
  color?: string;
};

function BarTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-roicard-border bg-roicard-bg-elevated px-3 py-2 shadow-xl theme-transition">
      <p className="text-xs text-roicard-text-muted">{label}</p>
      <p className="text-sm font-semibold text-roicard-text">
        {payload[0].value.toLocaleString()}
      </p>
    </div>
  );
}

export function StatsChart({
  title,
  data,
  color = "#FF8C42",
}: StatsChartProps) {
  const chartTheme = useChartTheme();

  return (
    <div className="rounded-xl border border-roicard-border bg-roicard-bg-elevated p-4 sm:p-6 theme-transition">
      <h3 className="mb-4 text-sm font-semibold text-roicard-text">{title}</h3>
      <div className="h-56 w-full sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
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
            <Tooltip content={<BarTooltip />} />
            <Bar
              dataKey="value"
              fill={color}
              radius={[4, 4, 0, 0]}
              animationDuration={800}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
