/**
 * SettingsSection
 *
 * Glass card wrapper for each settings tab panel content.
 */

import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { ReactNode } from "react";

type SettingsSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function SettingsSection({
  title,
  description,
  children,
  className,
}: SettingsSectionProps) {
  return (
    <Card variant="elevated" className={cn("glass-card", className)}>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-roicard-text">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-roicard-text-muted">{description}</p>
        )}
      </div>
      {children}
    </Card>
  );
}
