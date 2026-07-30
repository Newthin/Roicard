/**
 * usePublicProfileUsername
 *
 * Returns the logged-in user's public username from mock localStorage.
 * Set after onboarding completes; null if no profile exists yet.
 */

"use client";

import { getCurrentUserProfile } from "@/lib/profile/storage";
import { useEffect, useState } from "react";

export function usePublicProfileUsername() {
  const [username, setUsername] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    getCurrentUserProfile().then((p) => {
      setUsername(p?.username ?? null);
      setIsLoaded(true);
    });
  }, []);

  return { username, isLoaded, publicPath: username ? `/${username}` : null };
}
