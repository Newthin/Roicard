"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PasswordStrengthChecklist } from "@/components/ui/PasswordStrengthChecklist";
import { Textarea } from "@/components/ui/Textarea";
import type { AdminUser } from "@/lib/admin/types";
import { arePasswordRulesMet } from "@/lib/validation/password";
import { useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/AdminProvider";

const selectClassName =
  "h-11 w-full rounded-lg border border-roicard-border bg-roicard-bg-muted px-4 text-sm text-roicard-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-roicard-accent/50 focus-visible:border-roicard-accent/50";

type FormState = {
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  password: string;
  password_confirmation: string;
  status: "draft" | "active";
  role: "member" | "admin";
  account_access: "active" | "suspended";
  onboarding_completed: boolean;
  email_verified: boolean;
  campaign_code: string;
  title: string;
  organisation: string;
  role_description: string;
  bio: string;
  location: string;
  phone: string;
  whatsapp_phone: string;
  seeking: string;
  offering: string;
};

const EMPTY_FORM: FormState = {
  first_name: "",
  last_name: "",
  email: "",
  username: "",
  password: "",
  password_confirmation: "",
  status: "draft",
  role: "member",
  account_access: "active",
  onboarding_completed: true,
  email_verified: true,
  campaign_code: "",
  title: "",
  organisation: "",
  role_description: "",
  bio: "",
  location: "",
  phone: "",
  whatsapp_phone: "",
  seeking: "",
  offering: "",
};

function fromUser(user: AdminUser): FormState {
  return {
    ...EMPTY_FORM,
    first_name: user.firstName,
    last_name: user.lastName,
    email: user.email,
    username: user.username,
    status: user.status === "active" ? "active" : "draft",
    role: user.role,
    account_access: user.accessState,
    onboarding_completed: user.onboardingCompleted,
    email_verified: user.emailVerified,
    campaign_code: user.campaignCode ?? "",
    title: user.professionalTitle,
    organisation: user.organization,
    role_description: user.roleDescription,
    bio: user.bio,
    location: user.location,
    phone: user.phone,
    whatsapp_phone: user.whatsapp,
    seeking: user.seeking,
    offering: user.offering,
  };
}

export function AdminUserFormModal({
  isOpen,
  mode,
  user,
  onClose,
}: {
  isOpen: boolean;
  mode: "create" | "edit";
  user: AdminUser | null;
  onClose: () => void;
}) {
  const { registerUser, updateUser } = useAdmin();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(mode === "edit" && user ? fromUser(user) : EMPTY_FORM);
    setErrors({});
    setError("");
  }, [isOpen, mode, user]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const validate = (): Record<string, string> => {
    const next: Record<string, string> = {};
    if (!form.first_name.trim()) next.first_name = "First name is required";
    if (!form.last_name.trim()) next.last_name = "Last name is required";
    if (!form.email.trim()) {
      next.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next.email = "Enter a valid email address";
    }
    if (mode === "create" && !form.password) {
      next.password = "Password is required";
    }
    if (form.password && !arePasswordRulesMet(form.password, form.password_confirmation)) {
      next.password = "Password doesn't meet the requirements below";
    }
    return next;
  };

  const handleSubmit = async () => {
    setError("");
    const validation = validate();
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    setSaving(true);

    const common = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim(),
      username: form.username.trim() || undefined,
      status: form.status,
      role: form.role,
      campaign_code: form.campaign_code.trim() || undefined,
      onboarding_completed: form.onboarding_completed,
      email_verified: form.email_verified,
      account_access: form.account_access,
    };

    const result =
      mode === "create"
        ? await registerUser({
            ...common,
            password: form.password,
            password_confirmation: form.password_confirmation,
          })
        : await updateUser(user!.id, {
            firstName: form.first_name.trim(),
            lastName: form.last_name.trim(),
            email: form.email.trim(),
            username: form.username.trim(),
            campaignCode: form.campaign_code.trim() || null,
            ...(form.role !== user!.role ? { role: form.role } : {}),
            // Only send stateful controls when the admin actually changed
            // them, so saving an unrelated field can't re-publish a suspended
            // profile or revoke sessions as a side effect.
            ...(form.status !== (user!.status === "active" ? "active" : "draft")
              ? { status: form.status }
              : {}),
            ...(form.account_access !== user!.accessState
              ? { accessState: form.account_access }
              : {}),
            ...(form.onboarding_completed !== user!.onboardingCompleted
              ? { onboardingCompleted: form.onboarding_completed }
              : {}),
            ...(form.email_verified !== user!.emailVerified
              ? { emailVerified: form.email_verified }
              : {}),
            ...(form.password
              ? {
                  password: form.password,
                  password_confirmation: form.password_confirmation,
                }
              : {}),
            professionalTitle: form.title,
            organization: form.organisation,
            roleDescription: form.role_description,
            bio: form.bio,
            location: form.location,
            phone: form.phone,
            whatsapp: form.whatsapp_phone,
            seeking: form.seeking,
            offering: form.offering,
          });

    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "create" ? "Add User" : "Edit User"}
      description={
        mode === "create"
          ? "Create a member account. Admin-created accounts skip onboarding by default."
          : "Update login, access, membership and profile details."
      }
      className="max-w-2xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} isLoading={saving}>
            {mode === "create" ? "Create User" : "Save Changes"}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-roicard-accent">
            Identity
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="First Name"
              value={form.first_name}
              error={errors.first_name}
              onChange={(e) => setField("first_name", e.target.value)}
            />
            <Input
              label="Last Name"
              value={form.last_name}
              error={errors.last_name}
              onChange={(e) => setField("last_name", e.target.value)}
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              error={errors.email}
              onChange={(e) => setField("email", e.target.value)}
            />
            <Input
              label="Username"
              value={form.username}
              hint="Public profile URL slug (lowercase, hyphens)."
              onChange={(e) => setField("username", e.target.value)}
            />
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-roicard-accent">
            {mode === "create" ? "Password" : "Reset Password"}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Input
                label={mode === "create" ? "Password" : "New Password"}
                type="password"
                value={form.password}
                error={errors.password}
                placeholder={mode === "edit" ? "Leave blank to keep current" : undefined}
                onChange={(e) => setField("password", e.target.value)}
              />
              <PasswordStrengthChecklist
                password={form.password}
                confirmPassword={form.password_confirmation}
              />
            </div>
            <Input
              label="Confirm Password"
              type="password"
              value={form.password_confirmation}
              onChange={(e) => setField("password_confirmation", e.target.value)}
            />
          </div>
          {mode === "edit" && (
            <p className="text-xs text-roicard-text-muted">
              Changing the password signs the member out of all existing sessions.
            </p>
          )}
        </section>

        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-roicard-accent">
            Access & Membership
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-roicard-text">
                Membership
              </label>
              <select
                value={form.status}
                onChange={(e) =>
                  setField("status", e.target.value as FormState["status"])
                }
                className={selectClassName}
              >
                <option value="draft">Draft (not activated)</option>
                <option value="active">Active (paid / admin-activated)</option>
              </select>
              <p className="text-xs text-roicard-text-muted">
                Active publishes the public profile. It does not create a payment.
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-roicard-text">
                Account access
              </label>
              <select
                value={form.account_access}
                onChange={(e) =>
                  setField(
                    "account_access",
                    e.target.value as FormState["account_access"]
                  )
                }
                className={selectClassName}
              >
                <option value="active">Can sign in</option>
                <option value="suspended">Suspended (blocked)</option>
              </select>
              <p className="text-xs text-roicard-text-muted">
                Suspending revokes all sessions; membership is unchanged.
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-roicard-text">
                Role
              </label>
              <select
                value={form.role}
                onChange={(e) =>
                  setField("role", e.target.value as FormState["role"])
                }
                className={selectClassName}
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-roicard-text">
                Discount code
              </label>
              <Input
                value={form.campaign_code}
                placeholder="e.g. NLF2026"
                onChange={(e) =>
                  setField("campaign_code", e.target.value.toUpperCase())
                }
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-start gap-3 rounded-lg border border-roicard-border bg-roicard-bg-muted px-3 py-3">
              <input
                type="checkbox"
                checked={form.onboarding_completed}
                onChange={(e) =>
                  setField("onboarding_completed", e.target.checked)
                }
                className="mt-0.5 h-4 w-4 rounded border-roicard-border"
              />
              <span>
                <span className="block text-sm font-medium text-roicard-text">
                  Onboarding complete
                </span>
                <span className="block text-xs text-roicard-text-muted">
                  When off, the member is routed to /onboarding after sign-in.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-lg border border-roicard-border bg-roicard-bg-muted px-3 py-3">
              <input
                type="checkbox"
                checked={form.email_verified}
                onChange={(e) => setField("email_verified", e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-roicard-border"
              />
              <span>
                <span className="block text-sm font-medium text-roicard-text">
                  Email verified
                </span>
                <span className="block text-xs text-roicard-text-muted">
                  Unverified members cannot sign in.
                </span>
              </span>
            </label>
          </div>
        </section>

        {mode === "edit" && (
          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-roicard-accent">
              Public Profile
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Professional Title"
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
              />
              <Input
                label="Organisation"
                value={form.organisation}
                onChange={(e) => setField("organisation", e.target.value)}
              />
              <Input
                label="Location"
                value={form.location}
                onChange={(e) => setField("location", e.target.value)}
              />
              <Input
                label="Phone"
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
              />
              <Input
                label="WhatsApp"
                value={form.whatsapp_phone}
                onChange={(e) => setField("whatsapp_phone", e.target.value)}
              />
            </div>
            <Textarea
              label="Role Description"
              rows={2}
              maxLength={1000}
              value={form.role_description}
              onChange={(e) => setField("role_description", e.target.value)}
            />
            <Textarea
              label="Bio"
              rows={4}
              value={form.bio}
              onChange={(e) => setField("bio", e.target.value)}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Textarea
                label="Seeking"
                rows={2}
                maxLength={1000}
                value={form.seeking}
                onChange={(e) => setField("seeking", e.target.value)}
              />
              <Textarea
                label="Offering"
                rows={2}
                maxLength={1000}
                value={form.offering}
                onChange={(e) => setField("offering", e.target.value)}
              />
            </div>
          </section>
        )}
      </div>
    </Modal>
  );
}
