"use client";

import { AuthDivider } from "@/components/auth/AuthDivider";
import { SocialAuthRow } from "@/components/auth/SocialAuthButton";
import { InputField } from "@/components/auth/InputField";
import { Button } from "@/components/ui/Button";
import { PasswordStrengthChecklist } from "@/components/ui/PasswordStrengthChecklist";
import { useAuth } from "@/contexts/AuthContext";
import { arePasswordRulesMet } from "@/lib/validation/password";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function RegisterForm() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const allPassed = arePasswordRulesMet(password, confirmPassword);

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
      router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`);
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
      <SocialAuthRow mode="signup" />

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
        <PasswordStrengthChecklist
          password={password}
          confirmPassword={confirmPassword}
          className="-mt-2"
        />

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
