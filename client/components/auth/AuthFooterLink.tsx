import Link from "next/link";

type AuthFooterLinkProps = {
  text: string;
  linkText: string;
  href: string;
};

export function AuthFooterLink({ text, linkText, href }: AuthFooterLinkProps) {
  return (
    <p className="text-sm text-roicard-text-muted">
      {text}{" "}
      <Link
        href={href}
        className="font-medium text-roicard-accent transition-colors hover:text-roicard-text"
      >
        {linkText}
      </Link>
    </p>
  );
}
