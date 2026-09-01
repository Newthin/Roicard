import { ImageResponse } from "next/og";
import { DEMO_SLUG, DEMO_PUBLIC_PROFILE } from "@/lib/profile/demo";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

const BRAND = {
  bg: "#111111",
  text: "#ffffff",
  textMuted: "#a3a3a3",
  primary: "#e63946",
  orange: "#ef6b35",
  accent: "#ff8c42",
} as const;

interface ProfileData {
  user: { first_name: string; last_name: string };
  title: string | null;
  organisation: string | null;
  avatar: string | null;
  slug: string;
}

async function fetchProfile(slug: string): Promise<ProfileData | null> {
  try {
    const res = await fetch(`${API_URL}/public/${slug}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(
        ...Array.from(bytes.subarray(i, i + chunkSize))
      );
    }
    const mime = res.headers.get("content-type") || "image/jpeg";
    return `data:${mime};base64,${btoa(binary)}`;
  } catch {
    return null;
  }
}

function getInitials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

function GradientBar() {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 6,
        background: `linear-gradient(90deg, ${BRAND.primary}, ${BRAND.orange}, ${BRAND.accent})`,
      }}
    />
  );
}

function GenericBrandedImage() {
  return (
    <div
      style={{
        width: 1200,
        height: 630,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: BRAND.bg,
        fontFamily: "system-ui, -apple-system, sans-serif",
        position: "relative",
      }}
    >
      <GradientBar />
      <div
        style={{
          fontSize: 52,
          fontWeight: 700,
          color: BRAND.text,
          letterSpacing: "-1px",
        }}
      >
        ROICARD
      </div>
      <div
        style={{
          fontSize: 24,
          color: BRAND.textMuted,
          marginTop: 12,
        }}
      >
        Digital business cards that track your ROI
      </div>
      <div
        style={{
          position: "absolute",
          bottom: -160,
          left: "50%",
          transform: "translateX(-50%)",
          width: 700,
          height: 350,
          borderRadius: 350,
          background:
            "radial-gradient(ellipse, rgba(230,57,70,0.12), transparent 70%)",
        }}
      />
    </div>
  );
}

export default async function opengraphImage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const slug = username.toLowerCase();

  let profile = await fetchProfile(slug);

  if (!profile && slug === DEMO_SLUG) {
    profile = DEMO_PUBLIC_PROFILE as ProfileData;
  }

  if (!profile) {
    return new ImageResponse(<GenericBrandedImage />, {
      width: 1200,
      height: 630,
    });
  }

  const firstName = profile.user.first_name;
  const lastName = profile.user.last_name;
  const name = `${firstName} ${lastName}`;
  const roleText = [profile.title, profile.organisation]
    .filter(Boolean)
    .join(" at ");
  const initials = getInitials(firstName, lastName);

  let avatarDataUrl: string | null = null;
  if (profile.avatar) {
    avatarDataUrl = await fetchImageAsDataUrl(profile.avatar);
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          position: "relative",
          backgroundColor: BRAND.bg,
          fontFamily: "system-ui, -apple-system, sans-serif",
          overflow: "hidden",
        }}
      >
        <GradientBar />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 420,
            height: "100%",
            padding: 40,
          }}
        >
          {avatarDataUrl ? (
            <img
              src={avatarDataUrl}
              alt={name}
              style={{
                width: 280,
                height: 280,
                borderRadius: 140,
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                width: 280,
                height: 280,
                borderRadius: 140,
                background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 96,
                fontWeight: 700,
                color: BRAND.text,
              }}
            >
              {initials}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            paddingRight: 60,
          }}
        >
          <div
            style={{
              fontSize: 52,
              fontWeight: 700,
              color: BRAND.text,
              lineHeight: "1.1",
              letterSpacing: "-1px",
            }}
          >
            {name}
          </div>
          {roleText && (
            <div
              style={{
                fontSize: 28,
                color: BRAND.textMuted,
                marginTop: 16,
                lineHeight: "1.3",
              }}
            >
              {roleText}
            </div>
          )}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: 32,
              fontSize: 22,
              color: BRAND.accent,
              fontWeight: 600,
            }}
          >
            on ROICARD
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: -200,
            left: "50%",
            transform: "translateX(-50%)",
            width: 800,
            height: 400,
            borderRadius: 400,
            background:
              "radial-gradient(ellipse, rgba(230,57,70,0.12), transparent 70%)",
          }}
        />
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
