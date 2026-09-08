import type { Metadata } from "next";
import { PublicProfileClient } from "./PublicProfileClient";
import { DEMO_SLUG, DEMO_PUBLIC_PROFILE } from "@/lib/profile/demo";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://myroicard.com").replace(/\/$/, "");

interface ProfileMetadata {
  user: { first_name: string; last_name: string };
  title: string | null;
  organisation: string | null;
  bio: string | null;
  avatar: string | null;
  slug: string;
}

async function fetchProfileForMetadata(slug: string): Promise<ProfileMetadata | null> {
  try {
    const res = await fetch(`${API_URL}/public/${slug}?_metadata=1`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function generateStaticParams() {
  return [{ username: "_" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const slug = username.toLowerCase();

  let profile = await fetchProfileForMetadata(slug);

  if (!profile && slug === DEMO_SLUG) {
    profile = DEMO_PUBLIC_PROFILE as ProfileMetadata;
  }

  if (!profile) {
    return {
      title: { absolute: "ROICARD — Profile" },
      description: "Digital business cards that track your ROI.",
    };
  }

  const name = `${profile.user.first_name} ${profile.user.last_name}`;
  const { title: role, organisation: org } = profile;

  let metaTitle: string;
  if (role && org) {
    metaTitle = `${name}, ${role} at ${org}`;
  } else if (role) {
    metaTitle = `${name} — ${role}`;
  } else if (org) {
    metaTitle = `${name} at ${org}`;
  } else {
    metaTitle = `${name} — ROICARD`;
  }

  const description =
    profile.bio ||
    `${name}'s professional profile on ROICARD${role ? `, ${role}` : ""}${org ? ` at ${org}` : ""}.`;

  return {
    title: metaTitle,
    description,
    openGraph: {
      title: metaTitle,
      description,
      url: `${SITE_URL}/${slug}`,
      siteName: "ROICARD",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: metaTitle,
      description,
    },
  };
}

export default function PublicProfilePage() {
  return <PublicProfileClient />;
}
