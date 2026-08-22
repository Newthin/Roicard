"use client";

import { getDashboard } from "@/lib/api/dashboard";
import { useEffect, useState } from "react";

export function useLiveMemberStatus() {
  const [status, setStatus] = useState<string | null>(null);
  const [draftClosesAt, setDraftClosesAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    getDashboard()
      .then((d) => {
        if (active) {
          setStatus(d.user.status);
          setDraftClosesAt(d.user.draft_closes_at ?? null);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { status, draftClosesAt, isLoading };
}
