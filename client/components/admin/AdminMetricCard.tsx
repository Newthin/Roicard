/**
 * AdminMetricCard
 *
 * Simple metric display for admin overview — no trend, minimal styling.
 * Reuses Card from the shared UI library. When `href` is provided the whole
 * card becomes a link to the relevant admin section.
 */

import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { type LucideIcon } from "lucide-react";
import Link from "next/link";

type AdminMetricCardProps = {
  label: string;
  value: number | string;
  icon?: LucideIcon;
  className?: string;
  href?: string;
};

export function AdminMetricCard({
  label,
  value,
  icon: Icon,
  className,
  href,
}: AdminMetricCardProps) {
  const card = (
    <Card
      variant="default"
      className={cn(
        "border-roicard-border bg-roicard-bg-elevated theme-transition",
        "hover:border-roicard-accent/60 hover:bg-roicard-bg-muted",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-roicard-text-muted">{label}</p>
          <p className="mt-2 text-2xl font-bold text-roicard-text sm:text-3xl">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
        </div>
        {Icon && (
          <Icon className="h-5 w-5 shrink-0 text-roicard-accent" aria-hidden />
        )}
      </div>
    </Card>
  );

  if (!href) return card;

  return (
    <Link
      href={href}
      className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-roicard-accent focus-visible:ring-offset-2 focus-visible:ring-offset-roicard-bg"
    >
      {card}
    </Link>
  );
}
