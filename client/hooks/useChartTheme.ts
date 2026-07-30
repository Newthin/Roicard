/**
 * useChartTheme
 *
 * Reads chart styling tokens from CSS variables for Recharts.
 * Re-renders when theme changes via MutationObserver on data-theme.
 */

"use client";

import { useTheme } from "@/components/theme/ThemeProvider";
import { useEffect, useState } from "react";

export type ChartThemeTokens = {
  grid: string;
  tick: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
};

function readChartTokens(): ChartThemeTokens {
  if (typeof window === "undefined") {
    return {
      grid: "#2a2a2a",
      tick: "#a3a3a3",
      tooltipBg: "#1a1a1a",
      tooltipBorder: "#2a2a2a",
      tooltipText: "#ffffff",
    };
  }

  const root = document.documentElement;
  const style = getComputedStyle(root);

  return {
    grid: style.getPropertyValue("--rc-chart-grid").trim() || "#2a2a2a",
    tick: style.getPropertyValue("--rc-text-muted").trim() || "#a3a3a3",
    tooltipBg: style.getPropertyValue("--rc-bg-elevated").trim() || "#1a1a1a",
    tooltipBorder: style.getPropertyValue("--rc-border").trim() || "#2a2a2a",
    tooltipText: style.getPropertyValue("--rc-text").trim() || "#ffffff",
  };
}

export function useChartTheme(): ChartThemeTokens {
  const { theme, isReady } = useTheme();
  const [tokens, setTokens] = useState<ChartThemeTokens>(readChartTokens);

  useEffect(() => {
    if (!isReady) return;
    setTokens(readChartTokens());
  }, [theme, isReady]);

  return tokens;
}
