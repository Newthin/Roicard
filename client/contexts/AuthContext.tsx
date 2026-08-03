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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await authApi.login({ email, password });
      localStorage.setItem(TOKEN_KEY, response.token);
      localStorage.setItem(USER_KEY, JSON.stringify(response.user));
      setToken(response.token);
      setUser(response.user);
    },
    []
  );

  const register = useCallback(
    async (payload: authApi.RegisterPayload) => {
      const response = await authApi.register(payload);
      localStorage.setItem(USER_KEY, JSON.stringify(response.user));
      setUser(response.user);
      setToken(null);
    },
    []
  );

  const setSession = useCallback((newToken: string, newUser: User) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
    router.push("/auth/login");
  }, [router]);

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
