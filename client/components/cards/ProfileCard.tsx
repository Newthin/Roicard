import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { HTMLAttributes } from "react";

type ProfileCardProps = HTMLAttributes<HTMLDivElement> & {
  name: string;
  title?: string;
  username: string;
};

export function ProfileCard({
  name,
  title,
  username,
  className,
  ...props
}: ProfileCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)} {...props}>
      <div className="h-24 roicard-gradient" />
      <CardHeader className="relative -mt-10 px-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-roicard-bg-elevated bg-roicard-bg-muted text-2xl font-bold text-roicard-text">
          {name
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </div>
        <CardTitle className="mt-3">{name}</CardTitle>
        {title && (
          <p className="text-sm text-roicard-text-muted">{title}</p>
        )}
        <p className="text-sm text-roicard-accent">@{username}</p>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <p className="text-sm text-roicard-text-muted">
          Public profile card placeholder — connect, share, and track your ROI.
        </p>
      </CardContent>
    </Card>
  );
}
