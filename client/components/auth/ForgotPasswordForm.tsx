"use client";

import { ErrorMessage } from "@/components/auth/ErrorMessage";
import { InputField } from "@/components/auth/InputField";
import { Button } from "@/components/ui/Button";
import { forgotPassword } from "@/lib/api/auth";
import { CheckCircle2 } from "lucide-react";
import { FormEvent, useState } from "react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Please enter the email associated with your account.");
      return;
    }

    setIsLoading(true);
    try {
      await forgotPassword(email);
      setIsSent(true);
    } catch {
      setError("Failed to send reset link. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSent) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15">
          <CheckCircle2 className="h-7 w-7 text-emerald-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-roicard-text">Check your inbox</h2>
          <p className="text-sm leading-relaxed text-roicard-text-muted">
            We sent a password reset link to{" "}
            <span className="font-medium text-roicard-text">{email}</span>. The link
            expires in 15 minutes.
          </p>
        </div>
        <Button
          variant="secondary"
          fullWidth
          className="h-12 rounded-xl"
          onClick={() => setIsSent(false)}
        >
          Send again
        </Button>
      </div>
    );
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      {error && <ErrorMessage message={error} />}

      <InputField
        label="Email"
        type="email"
        name="email"
        placeholder="you@example.com"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />

      <Button type="submit" fullWidth isLoading={isLoading} className="h-12 rounded-xl">
        Send Reset Link
      </Button>
    </form>
  );
}
