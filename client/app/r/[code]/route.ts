import { NextRequest, NextResponse } from "next/server";

/** Same safe alphabet as ExecutiveReferral::CODE_PATTERN on the backend. */
const CODE_PATTERN = /^[A-HJ-NP-Z2-9]{10}$/;

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://myroicard.com").replace(/\/$/, "");

/**
 * Public executive short link.
 *
 * Records the click against the backend (which sets the 30-day last-click
 * cookie), then redirects to registration with the code as a fallback for
 * browsers that block cookies. If analytics is unavailable the link still
 * works — attribution is best-effort and never blocks signup.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  if (!CODE_PATTERN.test(code)) {
    return NextResponse.redirect(`${SITE_URL}/auth/register`);
  }

  const response = NextResponse.redirect(
    `${SITE_URL}/auth/register?ref=${encodeURIComponent(code)}`
  );

  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    const userAgent = request.headers.get("user-agent");
    const forwardedFor = request.headers.get("x-forwarded-for");
    const referer = request.headers.get("referer");

    if (userAgent) headers["User-Agent"] = userAgent;
    if (forwardedFor) headers["X-Forwarded-For"] = forwardedFor;
    if (referer) headers["Referer"] = referer;

    const clickResponse = await fetch(`${API_URL}/referrals/${code}/click`, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
      cache: "no-store",
      redirect: "manual",
    });

    const responseHeaders = clickResponse.headers as Headers & {
      getSetCookie?: () => string[];
    };
    const setCookies = responseHeaders.getSetCookie
      ? responseHeaders.getSetCookie()
      : (() => {
          const single = responseHeaders.get("set-cookie");
          return single ? [single] : [];
        })();

    for (const cookie of setCookies) {
      response.headers.append("set-cookie", cookie);
    }
  } catch {
    // Never break the short link for an analytics outage.
  }

  return response;
}
