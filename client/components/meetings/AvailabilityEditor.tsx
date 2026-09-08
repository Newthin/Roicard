"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type AvailabilityRule = {
  day_of_week: number;
  start_time: string;
  end_time: string;
};

type Props = {
  value: AvailabilityRule[];
  onChange: (rules: AvailabilityRule[]) => void;
};

export function AvailabilityEditor({ value, onChange }: Props) {
  const [rules, setRules] = useState<AvailabilityRule[]>(value);

  useEffect(() => {
    setRules(value);
  }, [value]);

  const updateRule = (index: number, field: keyof AvailabilityRule, val: string | number) => {
    const updated = rules.map((r, i) => (i === index ? { ...r, [field]: val } : r));
    setRules(updated);
    onChange(updated);
  };

  const addRule = () => {
    const usedDays = rules.map((r) => r.day_of_week);
    const nextDay = [1, 2, 3, 4, 5, 6, 0].find((d) => !usedDays.includes(d));
    if (nextDay === undefined) return;
    const updated = [...rules, { day_of_week: nextDay, start_time: "09:00", end_time: "17:00" }];
    setRules(updated);
    onChange(updated);
  };

  const removeRule = (index: number) => {
    const updated = rules.filter((_, i) => i !== index);
    setRules(updated);
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {rules.map((rule, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          <select
            value={rule.day_of_week}
            onChange={(e) => updateRule(i, "day_of_week", Number(e.target.value))}
            className="rounded-lg border border-roicard-border bg-roicard-bg-muted px-3 py-2 text-sm text-roicard-text"
          >
            {DAYS.map((day, idx) => (
              <option key={idx} value={idx}>{day}</option>
            ))}
          </select>
          <input
            type="time"
            value={rule.start_time}
            onChange={(e) => updateRule(i, "start_time", e.target.value)}
            className="rounded-lg border border-roicard-border bg-roicard-bg-muted px-3 py-2 text-sm text-roicard-text"
          />
          <span className="text-roicard-text-muted">to</span>
          <input
            type="time"
            value={rule.end_time}
            onChange={(e) => updateRule(i, "end_time", e.target.value)}
            className="rounded-lg border border-roicard-border bg-roicard-bg-muted px-3 py-2 text-sm text-roicard-text"
          />
          <button
            type="button"
            onClick={() => removeRule(i)}
            className="text-sm text-red-400 hover:text-red-300"
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addRule}
        disabled={rules.length >= 7}
        className="text-sm font-medium text-roicard-accent hover:text-roicard-accent/80 disabled:opacity-50"
      >
        + Add time period
      </button>
    </div>
  );
}
