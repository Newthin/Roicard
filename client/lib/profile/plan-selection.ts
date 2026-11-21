/**
 * Selected membership plan carried from the membership step to checkout.
 *
 * This is only a UI convenience: the server re-resolves the amount from the
 * plan code, so a tampered local value can never change what is charged.
 */

export type SelectedPlan = {
  code: string;
  name: string;
  amount: number;
  originalAmount: number | null;
  interval: "none" | "month" | "year";
  initialPrice: number;
  recurringPrice: number;
  includesCard: boolean;
  purpose: string;
  campaignCode?: string | null;
};

const KEY = "roicard_selected_plan";

export function saveSelectedPlan(plan: SelectedPlan): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(plan));
}

export function getSelectedPlan(): SelectedPlan | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SelectedPlan) : null;
  } catch {
    return null;
  }
}

export function clearSelectedPlan(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
