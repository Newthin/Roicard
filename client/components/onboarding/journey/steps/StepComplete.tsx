"use client";

import { useJourney } from "@/components/onboarding/journey/JourneyContext";
import { StepHeading } from "@/components/onboarding/journey/StepHeading";
import { Button } from "@/components/ui/Button";
import { updateProfile } from "@/lib/api/profiles";
import { uploadAvatar } from "@/lib/api/profile";
import { updateStoredProfilePhoto } from "@/lib/profile/storage";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle2, Compass, Share2, TrendingUp, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const CAPABILITIES = [
  { icon: Users, label: "Connect with professionals" },
  { icon: Share2, label: "Share your profile" },
  { icon: Compass, label: "Discover opportunities" },
  { icon: TrendingUp, label: "Grow your network" },
];

export function StepComplete() {
  const { complete, data } = useJourney();
  const { setSession } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const finalizedRef = useRef(false);

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

  return (
    <div className="space-y-8 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
          <CheckCircle2 className="h-9 w-9" />
        </div>
        <StepHeading
          centered
          eyebrow="All set"
          title="You're all set!"
          description="Your professional identity is now live. Welcome to the Roicard community."
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {CAPABILITIES.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-xl border border-roicard-border bg-roicard-bg-elevated/70 px-4 py-3 text-left"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-roicard-primary/10 text-roicard-accent">
              <Icon className="h-4 w-4" />
            </span>
            <span className="text-sm font-medium text-roicard-text">
              {label}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <Button
          onClick={() => router.push("/dashboard")}
          className="w-full rounded-xl"
          isLoading={saving}
          disabled={saving}
        >
          Go to Dashboard
        </Button>
        <Button
          variant="secondary"
          onClick={() => router.push(`/${username}`)}
          disabled={!username || saving}
          className="w-full rounded-xl"
        >
          View My Profile
        </Button>
      </div>
      {!saving && (
        <p className="text-sm text-roicard-text-muted">
          Redirecting to dashboard...
        </p>
      )}
    </div>
  );
}
