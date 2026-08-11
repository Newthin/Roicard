"use client";

import { AuthDivider } from "@/components/auth/AuthDivider";
import { SocialAuthRow } from "@/components/auth/SocialAuthButton";
import { InputField } from "@/components/auth/InputField";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { reactivateAccount } from "@/lib/api/auth";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    login,
    twoFactorPending,
    submitTwoFactor,
    cancelTwoFactor,
  } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [deactivated, setDeactivated] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [reactivateMsg, setReactivateMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    setDeactivated(false);
    setReactivateMsg(null);
    try {
      await login(email, password);
      // When 2FA is required, twoFactorPending flips true and the form
      // switches to the code screen — no navigation happens yet.
      if (!twoFactorPending) {
        const next = searchParams.get("next");
        router.push(next || "/dashboard");
      }
    } catch (err: unknown) {
      const data =
        err && typeof err === "object" && "response" in err
          ? (err as { response: { data: { message?: string; error?: string } } }).response?.data
          : null;

      if (data?.error === "email_not_verified") {
        router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`);
        return;
      }

      if (data?.error === "account_deactivated") {
        setError(data.message || "This account has been deactivated.");
        setDeactivated(true);
        return;
      }

      setError(data?.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  /** Reactivates a deactivated account using the same credentials. */
  const handleReactivate = async () => {
    setReactivating(true);
    setReactivateMsg(null);
    setError("");
    try {
      await reactivateAccount(email, password);
      setReactivateMsg("Account reactivated. You can now sign in.");
      setDeactivated(false);
    } catch (err: unknown) {
      const data =
        err && typeof err === "object" && "response" in err
          ? (err as { response: { data: { message?: string } } }).response?.data
          : null;
      setError(data?.message || "Unable to reactivate account.");
    } finally {
      setReactivating(false);
    }
  };

  const handleTwoFactorSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      await submitTwoFactor(code);
      const next = searchParams.get("next");
      router.push(next || "/dashboard");
    } catch (err: unknown) {
      const data =
        err && typeof err === "object" && "response" in err
          ? (err as { response: { data: { message?: string } } }).response?.data
          : null;
      setError(data?.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (twoFactorPending) {
    return (
      <div className="space-y-6">
        <form
          className="space-y-5"
          onSubmit={handleTwoFactorSubmit}
          noValidate
        >
          <p className="text-sm text-roicard-text-muted">
            Enter the 6-digit code from your authenticator app to complete
            sign-in.
          </p>

          <InputField
            label="Verification Code"
            name="code"
            placeholder="000000"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />

          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}

          <Button
            type="submit"
            fullWidth
            isLoading={isLoading}
            className="h-12 rounded-xl"
          >
            Verify Code
          </Button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              cancelTwoFactor();
              setCode("");
              setError("");
            }}
            className="text-sm font-medium text-roicard-text-muted transition-colors hover:text-roicard-text"
          >
            ← Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SocialAuthRow mode="signin" />

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
        {reactivateMsg && (
          <p className="text-sm text-emerald-500 text-center">{reactivateMsg}</p>
        )}

        <Button type="submit" fullWidth isLoading={isLoading} className="h-12 rounded-xl">
          Sign In
        </Button>

        {deactivated && password && (
          <div className="space-y-2">
            <p className="text-center text-xs text-roicard-text-muted">
              This account was deactivated. Reactivate it with the password
              above to sign in again.
            </p>
            <Button
              type="button"
              variant="secondary"
              fullWidth
              isLoading={reactivating}
              onClick={handleReactivate}
              className="h-11 rounded-xl"
            >
              Reactivate Account
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}