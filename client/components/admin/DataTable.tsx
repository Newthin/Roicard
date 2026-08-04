/**
 * DataTable
 *
 * Reusable admin data table with responsive horizontal scroll.
 *
 * Props:
 * - columns: header definitions
 * - children: table body rows
 */

import { cn } from "@/lib/cn";
import { ReactNode } from "react";

export type DataTableColumn = {
  key: string;
  label: string;
  className?: string;
};

type DataTableProps = {
  columns: DataTableColumn[];
  children: ReactNode;
  className?: string;
};

export function DataTable({ columns, children, className }: DataTableProps) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-2xl border border-roicard-border bg-roicard-bg-elevated shadow-sm shadow-[var(--rc-shadow)]",
        className
      )}
    >
      <table className="w-full min-w-[680px] text-left text-sm">
        <thead>
          <tr className="border-b border-roicard-border bg-roicard-bg-muted/50">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-roicard-text-muted",
                  col.className
                )}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-roicard-border/60">{children}</tbody>
      </table>
    </div>
  );
}

export function DataTableRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <tr
      className={cn(
        "group transition-colors hover:bg-roicard-bg-muted/30",
        className
      )}
    >
      {children}
    </tr>
  );
}

export function DataTableCell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <td className={cn("px-5 py-4 align-middle text-roicard-text-muted", className)}>
      {children}
    </td>
  );
}
