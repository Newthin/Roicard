/**
 * ConnectionStatsCard
 *
 * Dashboard summary metric card for connection insights.
 *
 * Props:
 * - label: metric title
 * - value: number or text to display
 * - href: optional link for the card
 * - icon: optional Lucide icon
 */

import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { LucideIcon } from "lucide-react";
import Link from "next/link";

type ConnectionStatsCardProps = {
  label: string;
  value: number | string;
  href?: string;
  icon?: LucideIcon;
  badge?: number;
  className?: string;
};

export function ConnectionStatsCard({
  label,
  value,
  href,
  icon: Icon,
  badge,
  className,
}: ConnectionStatsCardProps) {
  const content = (
    <Card
      variant="elevated"
      className={cn(
        "glass-card transition-colors",
        href && "hover:border-roicard-accent/30",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-roicard-text-muted">{label}</p>
          <p className="mt-2 text-3xl font-bold text-roicard-text">{value}</p>
        </div>
        {Icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-roicard-primary/10">
            <Icon className="h-5 w-5 text-roicard-accent" aria-hidden />
          </div>
        )}
      </div>
      {badge !== undefined && badge > 0 && (
        <span className="mt-3 inline-flex rounded-full bg-roicard-primary/20 px-2.5 py-0.5 text-xs font-medium text-roicard-accent">
          {badge} new
        </span>
      )}
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
