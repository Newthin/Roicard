/**
 * ConnectionsEmptyState
 *
 * Placeholder UI when a connections list has no items.
 *
 * Props:
 * - title, description, optional action label and href
 */

import { Button } from "@/components/ui/Button";
import { Users } from "lucide-react";
import Link from "next/link";

type ConnectionsEmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
};

export function ConnectionsEmptyState({
  title,
  description,
  actionLabel,
  actionHref,
}: ConnectionsEmptyStateProps) {
  return (
    <div className="glass-card flex flex-col items-center rounded-2xl px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-roicard-primary/10">
        <Users className="h-7 w-7 text-roicard-accent" aria-hidden />
      </div>
      <h3 className="text-lg font-semibold text-roicard-text">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-roicard-text-muted">
        {description}
      </p>
      {actionLabel && actionHref && (
        <Link href={actionHref} className="mt-6">
          <Button variant="secondary" className="rounded-xl">
            {actionLabel}
          </Button>
        </Link>
      )}
    </div>
  );
}
