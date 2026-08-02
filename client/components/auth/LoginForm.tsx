"use client";

import { AuthDivider } from "@/components/auth/AuthDivider";
import { SocialAuthButton } from "@/components/auth/SocialAuthButton";
import { InputField } from "@/components/auth/InputField";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response: { data: { message: string } } }).response?.data?.message
          : "Invalid credentials";
      setError(msg || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <SocialAuthButton provider="google" label="Continue with Google" />
        <SocialAuthButton provider="facebook" label="Continue with Facebook" />
        <SocialAuthButton provider="apple" label="Continue with Apple" />
        <SocialAuthButton provider="linkedin" label="Continue with LinkedIn" />
        <SocialAuthButton provider="x" label="Continue with X" />
      </div>

      <AuthDivider />

      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        <InputField
          label="Email"
          type="email"
          name="email"
          placeholder="you@example.com"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <div className="space-y-2">
          <InputField
            label="Password"
            type="password"
            name="password"
            placeholder="••••••••"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <div className="flex justify-end">
            <Link
              href="/auth/forgot-password"
              className="text-sm font-medium text-roicard-accent transition-colors hover:text-roicard-text"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-500 text-center">{error}</p>
        )}

        <Button type="submit" fullWidth isLoading={isLoading} className="h-12 rounded-xl">
          Sign In
        </Button>
      </form>
    </div>
  );
}
