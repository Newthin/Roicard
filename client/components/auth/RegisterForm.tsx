"use client";

import { AuthDivider } from "@/components/auth/AuthDivider";
import { SocialAuthButton } from "@/components/auth/SocialAuthButton";
import { InputField } from "@/components/auth/InputField";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/cn";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

type Rule = { key: string; label: string; test: (pw: string, cf: string) => boolean };

const RULES: Rule[] = [
  { key: "min", label: "At least 8 characters", test: (pw) => pw.length >= 8 },
  { key: "upper", label: "1 uppercase letter", test: (pw) => /[A-Z]/.test(pw) },
  { key: "lower", label: "1 lowercase letter", test: (pw) => /[a-z]/.test(pw) },
  { key: "num-sym", label: "1 number or special character", test: (pw) => /[\d\W]/.test(pw) },
  { key: "match", label: "Passwords match", test: (pw, cf) => pw.length > 0 && pw === cf },
];

export function RegisterForm() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const checks = useMemo(() => RULES.map((r) => ({ ...r, passed: r.test(password, confirmPassword) })), [password, confirmPassword]);
  const allPassed = checks.every((c) => c.passed);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!allPassed) return;

    setIsLoading(true);
    setError("");
    try {
      const parts = name.trim().split(" ");
      const firstName = parts[0] || "";
      const lastName = parts.slice(1).join(" ") || firstName;
      await register({
        first_name: firstName,
        last_name: lastName,
        email,
        password,
        password_confirmation: confirmPassword,
      });
      router.push("/onboarding");
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response: { data: { message: string } } }).response?.data?.message
          : "Registration failed";
      setError(msg || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <SocialAuthButton provider="google" label="Sign up with Google" />
        <SocialAuthButton provider="facebook" label="Sign up with Facebook" />
        <SocialAuthButton provider="apple" label="Sign up with Apple" />
        <SocialAuthButton provider="linkedin" label="Sign up with LinkedIn" />
        <SocialAuthButton provider="x" label="Sign up with X" />
      </div>

      <AuthDivider />

      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        <InputField
          label="Full Name"
          name="name"
          placeholder="Alex Morgan"
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />

        <InputField
          label="Email"
          type="email"
          name="email"
          placeholder="you@example.com"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <InputField
          label="Password"
          type="password"
          name="password"
          placeholder="••••••••"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        {/* Password strength checklist */}
        <ul className="space-y-1 -mt-2">
          {checks.map((c) => (
            <li key={c.key} className="flex items-center gap-2 text-xs">
              <span
                className={cn(
                  "shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-bold leading-none transition-colors",
                  c.passed
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                    : "border-roicard-border text-roicard-text-muted/60"
                )}
              >
                {c.passed ? "✓" : "✗"}
              </span>
              <span
                className={c.passed ? "text-emerald-400" : "text-roicard-text-muted/60"}
              >
                {c.label}
              </span>
            </li>
          ))}
        </ul>

        <InputField
          label="Confirm Password"
          type="password"
          name="password_confirmation"
          placeholder="••••••••"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />

        {error && (
          <p className="text-sm text-red-500 text-center">{error}</p>
        )}

        <Button type="submit" fullWidth isLoading={isLoading} className="h-12 rounded-xl">
          Create Account
        </Button>
      </form>
    </div>
  );
}
