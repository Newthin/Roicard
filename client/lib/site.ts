/**
 * Canonical site URL used for SEO surfaces (robots, sitemap, metadata).
 * NEXT_PUBLIC_SITE_URL is set in production; the fallback matches the
 * deployed origin (deploy.sh).
 */
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://myroicard.com"
).replace(/\/$/, "");
