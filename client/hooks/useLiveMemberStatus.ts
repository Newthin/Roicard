"use client";

import { getDashboard } from "@/lib/api/dashboard";
import { useEffect, useState } from "react";

type LiveMemberState = {
  /** Account/onboarding state from users.status. */
  status: string | null;
  /** Billing lifecycle: free | active | grace | expired | canceled | founding. */
  membershipStatus: string | null;
  plan: string | null;
  draftClosesAt: string | null;
  isLoading: boolean;
};

export function useLiveMemberStatus(): LiveMemberState {
  const [state, setState] = useState<Omit<LiveMemberState, "isLoading">>({
    status: null,
    membershipStatus: null,
    plan: null,
    draftClosesAt: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    getDashboard()
      .then((d) => {
        if (!active) return;
        setState({
          status: d.user.status,
          membershipStatus: d.user.membership_status ?? null,
          plan: d.user.plan ?? null,
          draftClosesAt: d.user.draft_closes_at ?? null,
        });
      })
      .catch(() => {})
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { ...state, isLoading };
}
