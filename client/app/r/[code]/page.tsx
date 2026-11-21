import { notFound, redirect } from "next/navigation";

/** Same safe alphabet as ExecutiveReferral::CODE_PATTERN on the backend. */
const CODE_PATTERN = /^[A-HJ-NP-Z2-9]{10}$/;

/**
 * Public executive short link. The QR asset encodes /r/CODE/.
 * Click tracking and attribution are added in the next Growth Network item.
 */
export default async function ReferralShortLink({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  if (!CODE_PATTERN.test(code)) {
    notFound();
  }

  redirect(`/auth/register?ref=${encodeURIComponent(code)}`);
}
