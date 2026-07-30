/**
 * Temporary mock auth for frontend development only.
 * Replace with real authentication when backend is ready.
 */

export const MOCK_AUTH_KEY = "isLoggedIn";

export function setMockLoggedIn(): void {
  localStorage.setItem(MOCK_AUTH_KEY, "true");
}

export function clearMockAuth(): void {
  localStorage.removeItem(MOCK_AUTH_KEY);
}

export function isMockLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(MOCK_AUTH_KEY) === "true";
}
