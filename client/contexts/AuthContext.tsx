"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import * as authApi from "@/lib/api/auth";

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  role: string;
  email_verified?: boolean;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: authApi.RegisterPayload) => Promise<void>;
  logout: () => void;
  setSession: (token: string, user: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = "roicard_token";
const USER_KEY = "roicard_user";

function clearStoredSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

interface StoredSession {
  token: string;
  user: User;
}

function readStoredSession(): StoredSession | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const rawUser = localStorage.getItem(USER_KEY);
    if (!token || !rawUser) return null;
    const user = JSON.parse(rawUser) as User;
    if (!user || !user.id || !user.email) return null;
    return { token, user };
  } catch {
    clearStoredSession();
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const clearState = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const setSession = useCallback((newToken: string, newUser: User) => {
    // Always clear the previous session before writing a new one so a stale
    // token can never be paired with a different cached user.
    clearStoredSession();
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    clearStoredSession();
    clearState();
    router.push("/auth/login");
  }, [router, clearState]);

  // Boot: restore the cached session, then validate it against GET /me so a
  // token left behind by a previous account never bleeds into the new one.
  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      const session = readStoredSession();
      if (!session) {
        if (!cancelled) {
          clearState();
          setIsLoading(false);
        }
        return;
      }

      setToken(session.token);
      setUser(session.user);

      try {
        const me = await authApi.me();
        if (cancelled) return;

        const server = me.user;
        const identityMatches =
          String(server.id) === String(session.user.id) &&
          String(server.email).toLowerCase() ===
            String(session.user.email).toLowerCase();

        if (!identityMatches) {
          // Old token for a different account — purge everything.
          clearStoredSession();
          clearState();
        } else if (
          server.status !== session.user.status ||
          server.role !== session.user.role
        ) {
          // Same identity, but status/role changed server-side — refresh.
          const freshUser: User = {
            id: server.id,
            first_name: server.first_name,
            last_name: server.last_name,
            email: server.email,
            status: server.status,
            role: server.role,
            email_verified: server.email_verified,
          };
          localStorage.setItem(USER_KEY, JSON.stringify(freshUser));
          setUser(freshUser);
        }
      } catch {
        // 401/409 are already handled in the axios interceptor (storage
        // cleared + redirected to /auth/login). For any other failure keep
        // the cached session off the token that remains.
        if (!cancelled && !localStorage.getItem(TOKEN_KEY)) {
          clearState();
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    boot();

    return () => {
      cancelled = true;
    };
  }, [clearState]);

  // Multi-tab sync: if another tab clears the token (logout), mirror it here.
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === TOKEN_KEY && !event.newValue) {
        clearState();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [clearState]);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await authApi.login({ email, password });
      setSession(response.token, response.user);
    },
    [setSession]
  );

  const register = useCallback(
    async (payload: authApi.RegisterPayload) => {
      // Purge any previous session BEFORE hitting the API so the old token is
      // never attached to this request — otherwise the backend would return the
      // previous account's profile while the UI thinks it just registered.
      clearStoredSession();
      clearState();

      const response = await authApi.register(payload);
      localStorage.setItem(USER_KEY, JSON.stringify(response.user));
      setUser(response.user);
      // No token is issued on registration (email verification is required),
      // so the session stays unauthenticated until the user verifies & logs in.
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        login,
        register,
        logout,
        setSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}