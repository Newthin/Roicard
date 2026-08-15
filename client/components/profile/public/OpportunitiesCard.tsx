/**
 * OpportunitiesCard
 *
 * Displays a single opportunities block — either what the member is "seeking"
 * or what they are "offering". Rendered once per variant so seeking and
 * offering appear on their own cards. Hidden when the content is empty.
 * Styled with the shared ProfileCard shell for visual consistency.
 *
 * Props:
 * - variant: which block to render ("seeking" | "offering")
 * - content: the text to display
 */

import { ProfileCard } from "@/components/profile/public/ProfileCard";
import { HandHeart, Search, type LucideIcon } from "lucide-react";

type OpportunitiesVariant = "seeking" | "offering";

type OpportunitiesCardProps = {
  variant: OpportunitiesVariant;
  content: string;
};

const VARIANT_CONFIG: Record<
  OpportunitiesVariant,
  { title: string; icon: LucideIcon }
> = {
  seeking: { title: "Seeking", icon: Search },
  offering: { title: "Offering", icon: HandHeart },
};

export function OpportunitiesCard({ variant, content }: OpportunitiesCardProps) {
  if (!content.trim()) return null;

  const { title, icon: Icon } = VARIANT_CONFIG[variant];

  return (
    <ProfileCard>
      <div className="border-b border-roicard-border/60 px-5 pb-3 pt-4">
        <span className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-roicard-primary/10 text-roicard-accent">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <span className="text-sm font-semibold text-roicard-text">
            {title}
          </span>
        </span>
      </div>

      <p className="px-5 pb-5 pt-4 text-sm leading-relaxed text-roicard-text-muted whitespace-pre-line text-justify">
        {content}
      </p>
    </ProfileCard>
  );
}
