import { BrandLogo } from "@/components/ui/BrandLogo";
import Link from "next/link";

type AuthHeaderProps = {
  title: string;
  subtitle: string;
};

export function AuthHeader({ title, subtitle }: AuthHeaderProps) {
  return (
    <div className="text-center">
      <Link
        href="/"
        className="inline-flex items-center justify-center transition-opacity hover:opacity-90"
      >
        <BrandLogo height={30} />
      </Link>

      <h1 className="mt-8 text-2xl font-bold tracking-tight text-roicard-text sm:text-3xl">
        {title}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-roicard-text-muted sm:text-base">
        {subtitle}
      </p>
    </div>
  );
}
