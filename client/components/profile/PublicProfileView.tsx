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
  return {
    firstName: p.user.first_name,
    lastName: p.user.last_name,
    email: p.user.email,
    profilePhotoUrl: p.avatar,
    professionalTitle: p.title ?? "",
    organization: p.organisation ?? "",
    bio: p.bio ?? "",
    phone: "",
    whatsapp: p.whatsapp_phone ?? "",
    dateOfBirth: (p.date_of_birth ?? "").slice(0, 10),
    gender: (p.gender as "" | "male" | "female" | "prefer_not_to_say") ?? "",
    location: p.location ?? "",
    social: {
      linkedin: "",
      instagram: "",
      twitter: "",
      facebook: "",
      tiktok: "",
      snapchat: "",
      website: "",
    },
    interests: Array.isArray(p.interests) ? p.interests : [],
    seeking: "",
    offering: "",
    username: p.slug,
    createdAt: "",
    membershipStatus: "active",
  };
}

/** Builds a downloadable vCard string from the profile fields. */
function buildVCard(profile: PublicProfile, profileUrl: string): string {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${profile.user.last_name};${profile.user.first_name};;;`,
    `FN:${profile.user.first_name} ${profile.user.last_name}`,
    profile.title && `TITLE:${profile.title}`,
    profile.organisation && `ORG:${profile.organisation}`,
    profile.user.email && `EMAIL;TYPE=INTERNET:${profile.user.email}`,
    `URL:${profileUrl}`,
    "END:VCARD",
  ].filter(Boolean);

  return lines.join("\r\n");
}

export function PublicProfileView({ username }: PublicProfileViewProps) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("none");
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    getPublicProfile(username.toLowerCase())
      .then(setProfile)
      .catch(() => setProfile(null))
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

  /** Downloads the profile as a .vcf contact card. */
  const handleSaveContact = useCallback(() => {
    if (!profile) return;
    const vcard = buildVCard(profile, profileUrl);
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
