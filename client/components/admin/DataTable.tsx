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
        "overflow-x-auto rounded-xl border border-roicard-border bg-roicard-bg-elevated",
        className
      )}
    >
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-roicard-border bg-roicard-bg-muted/40">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-4 py-3 font-medium text-roicard-text-muted",
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
    <tr className={cn("hover:bg-roicard-bg-muted/30 transition-colors", className)}>
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
    <td className={cn("px-4 py-3 text-roicard-text-muted", className)}>
      {children}
    </td>
  );
}
