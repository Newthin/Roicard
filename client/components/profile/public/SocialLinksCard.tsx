/**
 * SocialLinksCard ("Professional Links")
 *
 * Grid of icon links the member chose to share — social platforms plus quick
 * contact methods (email, call, WhatsApp). Each entry is an icon tile with a
 * label underneath and only renders when the underlying value exists.
 *
 * Props:
 * - social: SocialLinks object from the profile
 * - email / phone / whatsapp: optional contact methods
 */

import {
  FacebookIcon,
  InstagramIcon,
  LinkedInIcon,
  SnapchatIcon,
  TikTokIcon,
  XIcon,
} from "@/components/profile/public/BrandIcons";
import { ProfileCard } from "@/components/profile/public/ProfileCard";
import type { SocialLinks } from "@/lib/profile/types";
import { Globe, Link2, Mail, Phone } from "lucide-react";
import { ComponentType } from "react";

type SocialLinksCardProps = {
  social: SocialLinks;
  email?: string;
  phone?: string;
};

type LinkItem = {
  key: string;
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  external?: boolean;
};

/** Prefixes bare URLs with https:// so they resolve correctly. */
function ensureProtocol(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

export function SocialLinksCard({
  social,
  email,
  phone,
}: SocialLinksCardProps) {
  const links: LinkItem[] = [
    social.linkedin && {
      key: "linkedin",
      label: "LinkedIn",
      href: ensureProtocol(social.linkedin),
      icon: LinkedInIcon,
      external: true,
    },
    social.instagram && {
      key: "instagram",
      label: "Instagram",
      href: ensureProtocol(social.instagram),
      icon: InstagramIcon,
      external: true,
    },
    social.twitter && {
      key: "twitter",
      label: "X",
      href: ensureProtocol(social.twitter),
      icon: XIcon,
      external: true,
    },
    social.facebook && {
      key: "facebook",
      label: "Facebook",
      href: ensureProtocol(social.facebook),
      icon: FacebookIcon,
      external: true,
    },
    social.tiktok && {
      key: "tiktok",
      label: "TikTok",
      href: ensureProtocol(social.tiktok),
      icon: TikTokIcon,
      external: true,
    },
    social.snapchat && {
      key: "snapchat",
      label: "Snapchat",
      href: ensureProtocol(social.snapchat),
      icon: SnapchatIcon,
      external: true,
    },
    social.website && {
      key: "website",
      label: "Website",
      href: ensureProtocol(social.website),
      icon: Globe,
      external: true,
    },
    email && {
      key: "email",
      label: "Email",
      href: `mailto:${email}`,
      icon: Mail,
    },
    phone && {
      key: "phone",
      label: "Call",
      href: `tel:${phone.replace(/\s/g, "")}`,
      icon: Phone,
    },
  ].filter(Boolean) as LinkItem[];

  if (links.length === 0) return null;

  return (
    <ProfileCard>
      <div className="px-5 pt-4">
        <span className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-roicard-primary/10 text-roicard-accent">
            <Link2 className="h-4 w-4" aria-hidden />
          </span>
          <span className="text-sm font-semibold text-roicard-text">
            Professional Links
          </span>
        </span>
      </div>

      <ul className="grid grid-cols-4 gap-2 px-4 pb-5 pt-4 sm:grid-cols-6">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <li key={link.key}>
              <a
                href={link.href}
                target={link.external ? "_blank" : undefined}
                rel={link.external ? "noopener noreferrer" : undefined}
                aria-label={link.label}
                className="group flex flex-col items-center gap-1.5"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-roicard-border bg-roicard-bg-muted/60 text-roicard-text transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-roicard-accent/50 group-hover:bg-roicard-bg-elevated group-hover:text-roicard-accent">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-[11px] font-medium text-roicard-text-muted">
                  {link.label}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </ProfileCard>
  );
}
