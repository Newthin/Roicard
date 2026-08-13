"use client";

import { useJourney } from "@/components/onboarding/journey/JourneyContext";
import { StepHeading } from "@/components/onboarding/journey/StepHeading";
import { Button } from "@/components/ui/Button";
import { updateProfile } from "@/lib/api/profiles";
import { uploadAvatar } from "@/lib/api/profile";
import { updateStoredProfilePhoto } from "@/lib/profile/storage";
import { useAuth } from "@/contexts/AuthContext";
import { Check, Clock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function StepComplete() {
  const { complete, data, membershipStatus } = useJourney();
  const { setSession } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const finalizedRef = useRef(false);

  const isActive = membershipStatus === "active";
  const firstName = data.firstName || "there";

  useEffect(() => {
    if (finalizedRef.current) return;
    finalizedRef.current = true;

    const savedUsername = complete();
    setUsername(savedUsername);

    async function saveToBackend() {
      setSaving(true);
      try {
        const response = await updateProfile({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          bio: data.bio,
          city: data.location,
          professionalTitle: data.professionalTitle,
          organization: data.organization,
          whatsapp: data.whatsapp,
          dateOfBirth: data.dateOfBirth,
          gender: data.gender,
          socialLinks: JSON.stringify(data.social),
          interests: JSON.stringify(data.interests),
          seeking: data.seeking,
          offering: data.offering,
        });

        // If the API returns user data, update the stored session with existing token
        if (response.user) {
          const existingToken = localStorage.getItem("roicard_token") ?? "";
          setSession(existingToken, response.user);
        }

        // Upload avatar if changed (profile must exist first)
        if (data.profilePhotoUrl?.startsWith("data:image")) {
          const res = await fetch(data.profilePhotoUrl);
          const blob = await res.blob();
          const file = new File([blob], "avatar.jpg", { type: blob.type });
          const url = await uploadAvatar(file);
          updateStoredProfilePhoto(url);
        }

        const timer = setTimeout(() => {
          router.push("/dashboard");
        }, 2000);

        // FIX: correct variable name
        return () => clearTimeout(timer);
      } catch (err) {
        console.error("Failed to save profile:", err);
        if (err && typeof err === "object" && "response" in err) {
          const axiosErr = err as { response?: { data?: unknown; status?: number } };
          console.error("Response data:", JSON.stringify(axiosErr.response?.data));
          console.error("Status:", axiosErr.response?.status);
        }
        // Still navigate after a delay even if save fails
        const timer = setTimeout(() => {
          router.push("/dashboard");
        }, 2000);
        return () => clearTimeout(timer);
      } finally {
        setSaving(false);
      }
    }

    saveToBackend();
  }, [complete, data, router, setSession]);

  const statusItems = [
    { label: "Profile created", done: true },
    { label: "Profile link generated", done: true },
    {
      label: "Roicard Smart Card",
      done: isActive,
      meta: isActive ? "Ready" : "Pending activation",
    },
  ];

  return (
    <div className="space-y-8 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border-[1.5px] border-roicard-accent text-roicard-accent">
          <Check className="h-6 w-6" strokeWidth={2.5} />
        </div>
        <StepHeading
          centered
          eyebrow="Account Created"
          title="Your professional identity is live."
          description={`${firstName}, your Roicard profile is set up and ready to share. ${
            isActive
              ? "Your membership is active and your Smart Card is ready."
              : "Activate your membership anytime from your dashboard to unlock your Smart Card."
          }`}
        />
      </div>

      <ul className="mx-auto max-w-sm space-y-2.5 text-left">
        {statusItems.map((item) => (
          <li
            key={item.label}
            className={
              item.done
                ? "flex items-center gap-3.5 rounded-xl border border-roicard-border bg-roicard-bg-elevated/70 px-4 py-3.5"
                : "flex items-center gap-3.5 rounded-xl border border-dashed border-roicard-border px-4 py-3.5"
            }
          >
            <span
              className={
                item.done
                  ? "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400"
                  : "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[1.5px] border-roicard-text-muted text-roicard-text-muted"
              }
            >
              {item.done ? (
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
              ) : (
                <Clock className="h-3.5 w-3.5" />
              )}
            </span>
            <span className="text-sm font-medium text-roicard-text">
              {item.label}
            </span>
            {item.meta && (
              <span className="ml-auto text-xs font-medium text-roicard-text-muted">
                {item.meta}
              </span>
            )}
          </li>
        ))}
      </ul>

      <div className="mx-auto max-w-sm rounded-2xl border border-roicard-border bg-roicard-bg-elevated/70 p-5 text-left">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-roicard-text-muted">
          Next step
        </p>
        <p className="text-sm leading-relaxed text-roicard-text-muted">
          Your profile link is ready to share. Add it to your email signature or
          send it directly — {isActive ? "your membership is active and your Smart Card unlocks whenever you need it." : "activate your membership anytime to unlock your Smart Card."}
        </p>
      </div>

      <div className="mx-auto flex max-w-sm flex-col gap-3">
        <Button
          onClick={() => router.push("/dashboard")}
          className="w-full rounded-xl"
          isLoading={saving}
          disabled={saving}
        >
          Go to my dashboard
        </Button>
        {!isActive ? (
          <Link
            href="/dashboard"
            className="text-center text-[13.5px] font-medium text-roicard-text-muted underline underline-offset-[3px] transition-colors hover:text-roicard-text"
          >
            Activate membership now
          </Link>
        ) : (
          <Link
            href={`/${username}`}
            className="text-center text-[13.5px] font-medium text-roicard-text-muted underline underline-offset-[3px] transition-colors hover:text-roicard-text"
          >
            View my profile
          </Link>
        )}
      </div>
      {!saving && (
        <p className="text-sm text-roicard-text-muted">
          Redirecting to dashboard...
        </p>
      )}
    </div>
  );
}
