import { AuthCard } from "@/components/auth/AuthCard";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { ThemeToggle } from "@/components/theme";
import { ReactNode } from "react";

type AuthPageLayoutProps = {
  title: string;
  subtitle: string;
  footer?: ReactNode;
  children: ReactNode;
};

export function AuthPageLayout({
  title,
  subtitle,
  footer,
  children,
}: AuthPageLayoutProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10 sm:py-14">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <ThemeToggle compact />
      </div>

      <div className="w-full max-w-md space-y-8">
        <AuthHeader title={title} subtitle={subtitle} />
        <AuthCard>{children}</AuthCard>
        {footer && <div className="text-center">{footer}</div>}
      </div>
    </div>
  );
}
