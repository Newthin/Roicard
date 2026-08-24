import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

const apiBase =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

// Regenerate at most hourly; the backend caches the underlying query too.
export const revalidate = 3600;

type ProfileSitemapEntry = {
  slug: string;
  lastmod: string | null;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // trailingSlash is enabled, so canonical URLs carry a trailing slash
  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, changeFrequency: "weekly", priority: 1 },
    {
      url: `${siteUrl}/auth/register/`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  let profileEntries: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${apiBase}/public-sitemap`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const json = (await res.json()) as { data?: ProfileSitemapEntry[] };
      profileEntries = (json.data ?? []).map((p) => ({
        url: `${siteUrl}/${p.slug}/`,
        lastModified: p.lastmod ? new Date(p.lastmod) : undefined,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));
    }
  } catch {
    // API unreachable — ship the static entries rather than failing
  }

  return [...staticEntries, ...profileEntries];
}
