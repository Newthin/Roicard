import axios from "axios";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api",
  headers: { "Content-Type": "application/json", Accept: "application/json" },
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("roicard_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Send the cached identity along so the backend can detect a stale token
    // from a different account and answer 409 instead of leaking that account's
    // data (prevents cross-account profile bleed).
    try {
      const rawUser = localStorage.getItem("roicard_user");
      if (rawUser) {
        const user = JSON.parse(rawUser);
        if (user?.id) config.headers["X-Roicard-User-Id"] = String(user.id);
        if (user?.email) config.headers["X-Roicard-User-Email"] = String(user.email);
      }
    } catch {
      // malformed cached user — ignore
    }

    // Never let the browser cache authenticated responses.
    config.headers["Cache-Control"] = "no-store, no-cache, must-revalidate";
    config.headers["Pragma"] = "no-cache";
  }
  return config;
});

function clearStoredSession() {
  localStorage.removeItem("roicard_token");
  localStorage.removeItem("roicard_user");
}

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    // 401 = invalid/expired token; 409 = identity mismatch (token belongs to a
    // different account). Either way the cached session is untrustworthy.
    if (status === 401 || status === 409) {
      clearStoredSession();
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/auth")) {
        window.location.href = "/auth/login";
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;