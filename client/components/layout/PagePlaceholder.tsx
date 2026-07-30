import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { ReactNode } from "react";

type PagePlaceholderProps = {
  title: string;
  description: string;
  badge?: string;
  children?: ReactNode;
};

export function PagePlaceholder({
  title,
  description,
  badge,
  children,
}: PagePlaceholderProps) {
  return (
    <Card variant="elevated">
      <CardHeader>
        {badge && (
          <span className="inline-flex w-fit rounded-full bg-roicard-primary/15 px-3 py-1 text-xs font-medium text-roicard-accent">
            {badge}
          </span>
        )}
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {children ?? (
          <p className="text-sm text-roicard-text-muted">
            This is a placeholder page. Routing is configured and ready for
            feature development.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
