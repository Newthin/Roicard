/**
 * PublicProfileView
 *
 * Main assembler for the /[username] public profile route. Loads the profile
 * from onboarding localStorage (or mock seed data), manages connection state,
 * and composes the premium, mobile-first card stack.
 *
 * Layout is mobile-first and stays a single centered column on every breakpoint
 * (capped to a phone-like max width), per the ROICARD profile design.
 *
 * Props:
 * - username: dynamic route param from the Next.js [username] segment
 */

"use client";

import { ConnectionRequestModal } from "@/components/profile/public/ConnectionRequestModal";
import { GradientActionButton } from "@/components/profile/public/GradientActionButton";
import { ProfileAmbientBackdrop } from "@/components/profile/public/ProfileAmbientBackdrop";
import { PublicProfileCardStack } from "@/components/profile/public/PublicProfileCardStack";
import { PublicProfileHeader } from "@/components/profile/public/PublicProfileHeader";
import { SecondaryActionButtons } from "@/components/profile/public/SecondaryActionButtons";
import { Button } from "@/components/ui/Button";
import { addGuestConnectionRequest } from "@/lib/connections/storage";
import type { PublicProfile } from "@/lib/api/profile";
import { getPublicProfile } from "@/lib/api/profile";
import type {
  ConnectionRequestData,
  ConnectionState,
  UserProfile,
} from "@/lib/profile/types";
import { getPublicProfileUrl } from "@/lib/profile/username";
import { Check, Clock, UserPlus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type PublicProfileViewProps = {
  username: string;
};

/** Maps a PublicProfile API response into UserProfile shape for card components. */
function toUserProfile(p: PublicProfile): UserProfile {
  // Parse social_links array [{platform, value}] into the SocialLinks object
  const social: Record<string, string> = {};
  const defaultSocial = { linkedin: "", instagram: "", twitter: "", facebook: "", tiktok: "", snapchat: "", website: "" };
  if (Array.isArray(p.social_links)) {
    for (const link of p.social_links) {
      if (link?.platform && typeof link.value === "string") {
        social[link.platform] = link.value;
      }
    }
  }

  return {
    firstName: p.user.first_name,
    lastName: p.user.last_name,
    email: p.user.email,
    profilePhotoUrl: p.avatar,
    professionalTitle: p.title ?? "",
    roleDescription: p.role_description ?? "",
    organization: p.organisation ?? "",
    bio: p.bio ?? "",
    phone: p.phone ?? "",
    whatsapp: p.whatsapp_phone ?? "",
    dateOfBirth: (p.date_of_birth ?? "").slice(0, 10),
    gender: (p.gender as "" | "male" | "female" | "prefer_not_to_say") ?? "",
    location: p.location ?? "",
    social: {
      linkedin: social.linkedin ?? defaultSocial.linkedin,
      instagram: social.instagram ?? defaultSocial.instagram,
      twitter: social.twitter ?? defaultSocial.twitter,
      facebook: social.facebook ?? defaultSocial.facebook,
      tiktok: social.tiktok ?? defaultSocial.tiktok,
      snapchat: social.snapchat ?? defaultSocial.snapchat,
      website: social.website ?? defaultSocial.website,
    },
    interests: Array.isArray(p.interests) ? p.interests : [],
    seeking: p.seeking ?? "",
    offering: p.offering ?? "",
    username: p.slug,
    createdAt: "",
    membershipStatus: "active",
  };
}

/**
 * Fetches an image and returns it as a base64 data string with its MIME type,
 * or null when the image can't be loaded (network/CORS/format issues).
 */
async function fetchImageAsBase64(
  url: string
): Promise<{ data: string; mime: string } | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const mime =
      res.headers
        .get("content-type")
        ?.split(";")[0]
        ?.trim()
        .toLowerCase() || "image/jpeg";

    const bytes = new Uint8Array(buffer);
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...Array.from(bytes.subarray(i, i + chunkSize)));
    }
    return { data: btoa(binary), mime };
  } catch {
    return null;
  }
}

/**
 * Builds a downloadable vCard string from the profile fields. The profile
 * image is fetched and embedded inline (base64) so the saved contact carries
 * the member's photo — falling back to a URL reference when it can't load.
 */
async function buildVCard(profile: PublicProfile, profileUrl: string): Promise<string> {
  const phone = profile.phone ?? "";
  const whatsapp = profile.whatsapp_phone ?? "";
  const contactPhone = whatsapp || phone;

  const photoLines: string[] = [];
  if (profile.avatar) {
    const photo = await fetchImageAsBase64(profile.avatar);
    if (photo) {
      const typeParam = photo.mime.startsWith("image/png") ? "PNG" : "JPEG";
      photoLines.push(`PHOTO;ENCODING=b;TYPE=${typeParam}:${photo.data}`);
    } else {
      photoLines.push(`PHOTO;VALUE=URL:${profile.avatar}`);
    }
  }

  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${profile.user.last_name};${profile.user.first_name};;;`,
    `FN:${profile.user.first_name} ${profile.user.last_name}`,
    profile.title && `TITLE:${profile.title}`,
    profile.organisation && `ORG:${profile.organisation}`,
    profile.user.email && `EMAIL;TYPE=INTERNET:${profile.user.email}`,
    contactPhone && `TEL;TYPE=CELL:${contactPhone.replace(/[^\d+]/g, "")}`,
    ...photoLines,
    `URL:${profileUrl}`,
    "END:VCARD",
  ].filter(Boolean);

  return lines.join("\r\n");
}

export function PublicProfileView({ username }: PublicProfileViewProps) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [profileStatus, setProfileStatus] = useState<"loading" | "active" | "draft" | "not_found">("loading");
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("none");
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    getPublicProfile(username.toLowerCase())
      .then((data) => {
        setProfile(data);
        setProfileStatus("active");
      })
      .catch((err) => {
        const status = err?.response?.status;
        setProfileStatus(status === 403 ? "draft" : "not_found");
      })
      .finally(() => setIsLoaded(true));
  }, [username]);

  const cardProfile = useMemo(() => profile ? toUserProfile(profile) : null, [profile]);
  const hasWhatsApp = profile?.whatsapp_phone != null;
  const displayName = profile
    ? `${profile.user.first_name} ${profile.user.last_name}`
    : "";
  const profileUrl = getPublicProfileUrl(username);

  /** Opens the connection request modal for guests. */
  const handleConnectClick = () => {
    if (connectionState === "none") setIsModalOpen(true);
  };

  /** Saves the guest request and moves to the pending state. */
  const handleConnectionSubmit = useCallback(
    (data: ConnectionRequestData) => {
      addGuestConnectionRequest(username.toLowerCase(), data)
        .then(() => setConnectionState("pending"))
        .catch(() => setConnectionState("pending"));
    },
    [username]
  );

  /** Demo-only: pending → connected on the next tap. */
  const handleConnectStateAdvance = () => {
    if (connectionState === "pending") setConnectionState("connected");
  };

  /** Downloads the profile as a .vcf contact card (photo embedded). */
  const handleSaveContact = useCallback(async () => {
    if (!profile) return;
    const vcard = await buildVCard(profile, profileUrl);
    const blob = new Blob([vcard], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${profile.slug}.vcf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [profile, profileUrl]);

  /** Opens a pre-filled WhatsApp chat with the member (falls back to phone). */
  const handleWhatsApp = useCallback(() => {
    if (!profile) return;
    const number = (profile.whatsapp_phone || "").replace(/\D/g, "");
    if (!number) return;
    const text = encodeURIComponent(
      `Hi ${profile.user.first_name}, I found your ROICARD profile and would love to connect.`
    );
    window.open(
      `https://wa.me/${number}?text=${text}`,
      "_blank",
      "noopener,noreferrer"
    );
  }, [profile]);

  /** Native share with clipboard fallback. */
  const handleShareProfile = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `${displayName} — ROICARD`, url: profileUrl });
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(profileUrl);
    }
  }, [displayName, profileUrl]);

  /** Copies the profile URL to the clipboard. */
  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
    } catch {
      // clipboard unavailable
    }
  }, [profileUrl]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-roicard-bg">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-roicard-border border-t-roicard-primary"
          role="status"
          aria-label="Loading profile"
        />
      </div>
    );
  }

  if (profileStatus === "draft") {
    return (
      <div className="min-h-screen bg-roicard-bg">
        <PublicProfileHeader onShare={handleShareProfile} onCopyLink={handleCopyLink} />
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-roicard-text">Profile not yet available</h1>
          <p className="mt-3 text-sm text-roicard-text-muted">
            This member&apos;s profile is still being set up. Check back soon.
          </p>
          <Link href="/auth/register" className="mt-8 inline-block">
            <Button className="rounded-xl">Create Your Roicard</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-roicard-bg">
        <PublicProfileHeader onShare={handleShareProfile} onCopyLink={handleCopyLink} />
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-roicard-text">Profile not found</h1>
          <p className="mt-3 text-sm text-roicard-text-muted">
            No ROICARD profile exists for @{username}.
          </p>
          <Link href="/auth/register" className="mt-8 inline-block">
            <Button className="rounded-xl">Create Your Roicard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-roicard-bg">
      <PublicProfileHeader onShare={handleShareProfile} onCopyLink={handleCopyLink} />

      <ProfileAmbientBackdrop />

      <main className="relative mx-auto w-full max-w-[480px] px-4 pb-16 pt-6 sm:px-6">
        <div className="onboarding-step-enter">
          <PublicProfileCardStack
            profile={cardProfile!}
            showGuestInvite
            actions={
              <>
                <div className="pt-2">
                  {connectionState === "connected" ? (
                    <Button
                      fullWidth
                      disabled
                      className="h-14 rounded-2xl bg-emerald-600/90 text-base hover:bg-emerald-600/90"
                    >
                      <Check className="h-5 w-5" />
                      Connected
                    </Button>
                  ) : connectionState === "pending" ? (
                    <Button
                      fullWidth
                      variant="secondary"
                      onClick={handleConnectStateAdvance}
                      className="h-14 rounded-2xl border-roicard-accent/30 text-base"
                    >
                      <Clock className="h-5 w-5 text-roicard-accent" />
                      Pending
                    </Button>
                  ) : (
                    <GradientActionButton
                      onClick={handleConnectClick}
                      icon={<UserPlus className="h-5 w-5" aria-hidden />}
                    >
                      Connect
                    </GradientActionButton>
                  )}
                </div>

                <SecondaryActionButtons
                  onSaveContact={handleSaveContact}
                  onWhatsApp={hasWhatsApp ? handleWhatsApp : undefined}
                />
              </>
            }
          />
        </div>
      </main>

      <ConnectionRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleConnectionSubmit}
        profileName={displayName}
      />
    </div>
  );
}
