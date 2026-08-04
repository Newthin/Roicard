/**
 * Shared password strength rules + helpers.
 *
 * Same visual language used by the signup form: a checklist of pill chips
 * (emerald when passed, muted when not). Reused wherever a password is set —
 * signup, admin "Add User", password reset, etc.
 */

export type PasswordRule = {
  key: string;
  label: string;
  test: (password: string, confirmPassword: string) => boolean;
};

export const PASSWORD_RULES: PasswordRule[] = [
  { key: "min", label: "At least 8 characters", test: (pw) => pw.length >= 8 },
  { key: "upper", label: "1 uppercase letter", test: (pw) => /[A-Z]/.test(pw) },
  { key: "lower", label: "1 lowercase letter", test: (pw) => /[a-z]/.test(pw) },
  { key: "num-sym", label: "1 number or special character", test: (pw) => /[\d\W]/.test(pw) },
  { key: "match", label: "Passwords match", test: (pw, cf) => pw.length > 0 && pw === cf },
];

export type PasswordCheck = PasswordRule & { passed: boolean };

export function getPasswordChecks(
  password: string,
  confirmPassword: string
): PasswordCheck[] {
  return PASSWORD_RULES.map((rule) => ({
    ...rule,
    passed: rule.test(password, confirmPassword),
  }));
}

/** True when every password rule is satisfied. */
export function arePasswordRulesMet(
  password: string,
  confirmPassword: string
): boolean {
  return getPasswordChecks(password, confirmPassword).every((check) => check.passed);
}
