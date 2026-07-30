/**
 * FeatureCard
 *
 * Reusable glassmorphism card for the landing page features grid.
 * Displays an icon, title, and short description for a single product capability.
 */

import { cn } from "@/lib/cn";
import { LucideIcon } from "lucide-react";

export type FeatureCardProps = {
  /** Lucide icon component rendered at the top of the card */
  icon: LucideIcon;
  /** Feature headline */
  title: string;
  /** One-line feature description */
  description: string;
  /** Optional class names for grid layout overrides */
  className?: string;
};

export function FeatureCard({
  icon: Icon,
  title,
  description,
  className,
}: FeatureCardProps) {
  return (
    <article
      className={cn(
        "glass-card group rounded-2xl p-6 transition-all duration-300",
        "hover:border-roicard-accent/25 hover:bg-roicard-bg-elevated/70 hover:shadow-xl hover:shadow-roicard-primary/5",
        className
      )}
    >
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-roicard-primary/10 ring-1 ring-roicard-primary/20 transition-colors group-hover:bg-roicard-primary/20">
        <Icon className="h-6 w-6 text-roicard-accent" aria-hidden />
      </div>
      <h3 className="text-lg font-semibold text-roicard-text">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-roicard-text-muted">
        {description}
      </p>
    </article>
  );
}
