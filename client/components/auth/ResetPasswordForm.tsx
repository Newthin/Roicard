"use client";

import { ErrorMessage } from "@/components/auth/ErrorMessage";
import { InputField } from "@/components/auth/InputField";
import { Button } from "@/components/ui/Button";
import { resetPassword } from "@/lib/api/auth";
import { cn } from "@/lib/cn";
import { Check, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

type Requirement = {
  label: string;
  met: boolean;
};

function PasswordRequirements({ password }: { password: string }) {
  const requirements: Requirement[] = useMemo(
    () => [
      { label: "At least 8 characters", met: password.length >= 8 },
      { label: "Contains a number", met: /\d/.test(password) },
      { label: "Contains uppercase letter", met: /[A-Z]/.test(password) },
    ],
    [password]
  );

  return (
    <ul className="space-y-2 rounded-xl border border-roicard-border/60 bg-roicard-bg-muted/40 p-4">
      {requirements.map((req) => (
        <li key={req.label} className="flex items-center gap-2 text-sm">
          {req.met ? (
            <Check className="h-4 w-4 text-emerald-400" aria-hidden />
          ) : (
            <X className="h-4 w-4 text-roicard-text-muted/60" aria-hidden />
          )}
          <span
            className={cn(
              req.met ? "text-emerald-300/90" : "text-roicard-text-muted"
            )}
          >
            {req.label}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;
  const isPasswordValid =
    password.length >= 8 && /\d/.test(password) && /[A-Z]/.test(password);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!isPasswordValid) {
      setFormError("Please meet all password requirements before continuing.");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Passwords do not match. Please try again.");
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword({ token, email, password, password_confirmation: confirmPassword });
      setIsSuccess(true);
    } catch {
      setFormError("Failed to reset password. The link may be expired.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15">
          <Check className="h-7 w-7 text-emerald-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-roicard-text">Password updated</h2>
          <p className="text-sm text-roicard-text-muted">
            Your password has been reset successfully. You can now sign in with
            your new credentials.
          </p>
        </div>
        <Link
          href="/auth/login"
          className="flex h-12 w-full items-center justify-center rounded-xl bg-roicard-primary text-sm font-medium text-roicard-on-primary transition-colors hover:bg-roicard-primary-hover"
        >
          Continue to Sign In
        </Link>
      </div>
    );
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      {formError && <ErrorMessage message={formError} />}

      <InputField
        label="New Password"
        type="password"
        name="password"
        placeholder="••••••••"
        autoComplete="new-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />

      {password.length > 0 && <PasswordRequirements password={password} />}

      <InputField
        label="Confirm Password"
        type="password"
        name="confirmPassword"
        placeholder="••••••••"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
        error={
          passwordsMismatch ? "Passwords do not match" : undefined
        }
      />

      {passwordsMatch && (
        <p className="flex items-center gap-2 text-sm text-emerald-400">
          <Check className="h-4 w-4" aria-hidden />
          Passwords match
        </p>
      )}

      <Button
        type="submit"
        fullWidth
        isLoading={isLoading}
        disabled={!isPasswordValid || !passwordsMatch}
        className="h-12 rounded-xl"
      >
        Reset Password
      </Button>
    </form>
  );
}
