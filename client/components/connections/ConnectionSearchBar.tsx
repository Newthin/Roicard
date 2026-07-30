/**
 * ConnectionSearchBar
 *
 * Search input for filtering the My Connections list.
 *
 * Props:
 * - value: current search query
 * - onChange: called when query updates
 * - resultCount: optional count shown beside the field
 */

"use client";

import { Input } from "@/components/ui/Input";
import { Search } from "lucide-react";

type ConnectionSearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  resultCount?: number;
};

export function ConnectionSearchBar({
  value,
  onChange,
  resultCount,
}: ConnectionSearchBarProps) {
  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-roicard-text-muted"
        aria-hidden
      />
      <Input
        type="search"
        placeholder="Search by name, title, or organization..."
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="pl-10"
        aria-label="Search connections"
      />
      {resultCount !== undefined && (
        <p className="mt-2 text-xs text-roicard-text-muted">
          {resultCount} connection{resultCount === 1 ? "" : "s"} found
        </p>
      )}
    </div>
  );
}
