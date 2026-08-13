/**
 * FeatureCard
 *
 * Card for the landing features grid — warm marketing palette with an icon row
 * and a highlight variant for the flagship capability.
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
  /** Draw attention to the flagship feature */
  highlight?: boolean;
  /** Optional class names for grid layout overrides */
  className?: string;
};

export function FeatureCard({
  icon: Icon,
  title,
  description,
  highlight = false,
  className,
}: FeatureCardProps) {
  return (
    <article
      className={cn(
        "group rounded-[18px] border border-white/[0.08] bg-[#16130F] p-7",
        highlight &&
          "border-[rgba(255,122,61,0.4)] bg-[linear-gradient(160deg,rgba(255,122,61,0.07),rgba(192,39,45,0.03))]",
        className
      )}
    >
      <div
        aria-hidden
        className={cn(
          "mb-[18px] flex h-[46px] w-[46px] items-center justify-center rounded-xl border border-[rgba(255,122,61,0.25)] bg-[rgba(255,122,61,0.12)] text-[#FF7A3D]"
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-display text-[17.5px] font-bold text-[#F5F3F0]">
        {title}
      </h3>
      <p className="mt-[10px] text-[14.5px] leading-[1.6] text-[#A8A29A]">
        {description}
      </p>
    </article>
  );
}