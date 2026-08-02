/**
 * useLiveMemberStatus
 *
 * Pulls the authenticated user's live membership status from the dashboard
 * API, so UI gating (e.g. showing the pay-later card) reflects the backend
 * instead of a possibly-stale cached session role/status.
 */

"use client";

import { getDashboard } from "@/lib/api/dashboard";
import { useEffect, useState } from "react";

export function useLiveMemberStatus() {
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    getDashboard()
      .then((d) => {
        if (active) setStatus(d.user.status);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { status, isLoading };
}