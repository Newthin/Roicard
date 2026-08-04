import { cn } from "@/lib/cn";
import { getPasswordChecks } from "@/lib/validation/password";
import { useMemo } from "react";

/**
 * Password strength checklist — pill chips with a ✓/✗ indicator.
 * Same visual language as the signup form.
 */
export function PasswordStrengthChecklist({
  password,
  confirmPassword,
  className,
}: {
  password: string;
  confirmPassword: string;
  className?: string;
}) {
  const checks = useMemo(
    () => getPasswordChecks(password, confirmPassword),
    [password, confirmPassword]
  );

  return (
    <ul className={cn("space-y-1", className)}>
      {checks.map((check) => (
        <li key={check.key} className="flex items-center gap-2 text-xs">
          <span
            className={cn(
              "shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-bold leading-none transition-colors",
              check.passed
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                : "border-roicard-border text-roicard-text-muted/60"
            )}
          >
            {check.passed ? "✓" : "✗"}
          </span>
          <span
            className={
              check.passed ? "text-emerald-400" : "text-roicard-text-muted/60"
            }
          >
            {check.label}
          </span>
        </li>
      ))}
    </ul>
  );
}
