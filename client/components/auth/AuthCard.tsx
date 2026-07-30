import { cn } from "@/lib/cn";
import { HTMLAttributes } from "react";

type AuthCardProps = HTMLAttributes<HTMLDivElement>;

export function AuthCard({ className, children, ...props }: AuthCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-roicard-border/80 bg-roicard-bg-elevated/90 p-6 shadow-2xl shadow-[var(--rc-shadow)] backdrop-blur-sm theme-transition sm:p-8",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
