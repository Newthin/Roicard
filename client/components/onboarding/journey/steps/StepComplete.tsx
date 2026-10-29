"use client";

import { useJourney } from "@/components/onboarding/journey/JourneyContext";
import { StepHeading } from "@/components/onboarding/journey/StepHeading";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { uploadAvatar } from "@/lib/api/profile";
import { completeOnboarding, updateProfile } from "@/lib/api/profiles";
import {
  clearJourneyState,
  clearPaymentSnapshot,
  setOnboardingComplete,
  updateStoredProfilePhoto,
} from "@/lib/profile/storage";
import { CheckCircle2, Compass, Share2, TrendingUp, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const CAPABILITIES = [
  { icon: Users, label: "Connect with professionals" },
  { icon: Share2, label: "Share your profile" },
  { icon: Compass, label: "Discover opportunities" },
  { icon: TrendingUp, label: "Grow your network" },
];

type FinalizeState = "saving" | "success" | "error";

export function StepComplete() {
  const { complete, data } = useJourney();
  const { setSession, token } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState<string>("");
  const [state, setState] = useState<FinalizeState>("saving");
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finalize = useCallback(async () => {
    setState("saving");
    setError(null);

    const savedUsername = complete();
    setUsername(savedUsername);

    try {
      // 1. Persist the profile through the member's normal profile endpoint.
      //    (This endpoint also stamps onboarding for legacy clients, but we
      //    still call the explicit completion endpoint below.)
      const profileResponse = await updateProfile({
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

      // 2. Mark the journey complete on the SERVER. The returned user carries
      //    `next_step: dashboard` — only then do we clear local journey state.
      const completed = await completeOnboarding();

      setOnboardingComplete();
      clearJourneyState();
      clearPaymentSnapshot();

      const freshUser = completed.user ?? profileResponse.user;
      if (token && freshUser) {
        setSession(token, freshUser);
      }

      // 3. Avatar is best-effort: a failed upload must not trap the member in
      //    onboarding or roll back a successful completion.
      if (data.profilePhotoUrl?.startsWith("data:image")) {
        try {
          const res = await fetch(data.profilePhotoUrl);
          const blob = await res.blob();
          const file = new File([blob], "avatar.jpg", { type: blob.type });
          const url = await uploadAvatar(file);
          updateStoredProfilePhoto(url);
        } catch (uploadError) {
          console.warn("Avatar upload failed; profile is still complete", uploadError);
        }
      }

      setState("success");
      redirectTimer.current = setTimeout(() => router.push("/dashboard"), 2000);
    } catch (err) {
      console.error("Failed to finalize onboarding:", err);
      setState("error");
      setError(
        "We couldn't save your profile. Check your connection and try again — your progress is still here."
      );
    }
  }, [complete, data, router, setSession, token]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    finalize();

    return () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, [finalize]);

  const saving = state === "saving";

  return (
    <div className="space-y-8 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
          <CheckCircle2 className="h-9 w-9" />
        </div>
        <StepHeading
          centered
          eyebrow="All set"
          title={state === "error" ? "Almost there" : "You're all set!"}
          description={
            state === "error"
              ? "Your details are safe. Retry to finish setting up your account."
              : "Your professional identity is now live. Welcome to the Roicard community."
          }
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

      {error && (
        <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-500">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3">
        {state === "error" ? (
          <Button
            onClick={finalize}
            className="w-full rounded-xl"
            disabled={saving}
          >
            Retry
          </Button>
        ) : (
          <Button
            onClick={() => router.push("/dashboard")}
            className="w-full rounded-xl"
            isLoading={saving}
            disabled={saving}
          >
            Go to Dashboard
          </Button>
        )}

        <Button
          variant="secondary"
          onClick={() => router.push(`/${username}`)}
          disabled={!username || saving}
          className="w-full rounded-xl"
        >
          View My Profile
        </Button>
      </div>

      {saving && (
        <p className="text-sm text-roicard-text-muted">
          Saving your profile…
        </p>
      )}
      {state === "success" && (
        <p className="text-sm text-roicard-text-muted">
          Redirecting to dashboard...
        </p>
      )}
    </div>
  );
}
