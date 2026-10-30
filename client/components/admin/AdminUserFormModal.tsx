"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PasswordStrengthChecklist } from "@/components/ui/PasswordStrengthChecklist";
import { Textarea } from "@/components/ui/Textarea";
import type { AdminUser } from "@/lib/admin/types";
import type {
  AdminAchievementEntry,
  AdminEducationEntry,
  AdminExperienceEntry,
} from "@/lib/api/admin";
import { arePasswordRulesMet } from "@/lib/validation/password";
import { Camera } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAdmin, type AdminUserSaveInput } from "@/components/admin/AdminProvider";

const selectClassName =
  "h-11 w-full rounded-lg border border-roicard-border bg-roicard-bg-muted px-4 text-sm text-roicard-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-roicard-accent/50 focus-visible:border-roicard-accent/50";

const SOCIAL_PLATFORMS = [
  "linkedin",
  "instagram",
  "twitter",
  "facebook",
  "youtube",
  "tiktok",
  "snapchat",
  "website",
] as const;

type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

type EducationRow = {
  institution: string;
  degree: string;
  start_year: string;
  end_year: string;
  honours: string;
};

type ExperienceRow = {
  title: string;
  company: string;
  start_date: string;
  end_date: string;
  location: string;
};

type AchievementRow = {
  title: string;
  issuer: string;
  date: string;
};

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
  send_welcome_email: boolean;
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
  date_of_birth: string;
  gender: string;
  interests: string;
  social: Record<SocialPlatform, string>;
  education: EducationRow[];
  experience: ExperienceRow[];
  achievements: AchievementRow[];
};

const EMPTY_SOCIAL: Record<SocialPlatform, string> = {
  linkedin: "",
  instagram: "",
  twitter: "",
  facebook: "",
  youtube: "",
  tiktok: "",
  snapchat: "",
  website: "",
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
  send_welcome_email: false,
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
  date_of_birth: "",
  gender: "",
  interests: "",
  social: { ...EMPTY_SOCIAL },
  education: [],
  experience: [],
  achievements: [],
};

function fromUser(user: AdminUser): FormState {
  const social = { ...EMPTY_SOCIAL };
  for (const link of user.socialLinks ?? []) {
    if ((SOCIAL_PLATFORMS as readonly string[]).includes(link.platform)) {
      social[link.platform as SocialPlatform] = link.value ?? "";
    }
  }

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
    date_of_birth: user.dateOfBirth ?? "",
    gender: user.gender ?? "",
    interests: (user.interests ?? []).join(", "),
    social,
    education: (user.education ?? []).map((row) => ({
      institution: row.institution ?? "",
      degree: row.degree ?? "",
      start_year: row.start_year ? String(row.start_year) : "",
      end_year: row.end_year ? String(row.end_year) : "",
      honours: row.honours ?? "",
    })),
    experience: (user.experience ?? []).map((row) => ({
      title: row.title ?? "",
      company: row.company ?? "",
      start_date: row.start_date ? String(row.start_date).slice(0, 10) : "",
      end_date: row.end_date ? String(row.end_date).slice(0, 10) : "",
      location: row.location ?? "",
    })),
    achievements: (user.achievements ?? []).map((row) => ({
      title: row.title ?? "",
      issuer: row.issuer ?? "",
      date: row.date ? String(row.date).slice(0, 10) : "",
    })),
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
  const { registerUser, updateUser, uploadAvatar } = useAdmin();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  // Once the account row exists, a failed profile/avatar save must not create
  // a duplicate account when the admin presses the button again.
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setForm(mode === "edit" && user ? fromUser(user) : EMPTY_FORM);
    setErrors({});
    setError("");
    setAvatarFile(null);
    setCreatedUserId(null);
    setAvatarPreview(mode === "edit" ? user?.profilePhotoUrl ?? null : null);
  }, [isOpen, mode, user]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const setSocial = (platform: SocialPlatform, value: string) => {
    setForm((prev) => ({ ...prev, social: { ...prev.social, [platform]: value } }));
  };

  const handleAvatarFile = (file: File | undefined) => {
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
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

  const buildProfileUpdates = (): AdminUserSaveInput => {
    const links = (Object.entries(form.social) as [SocialPlatform, string][])
      .filter(([, value]) => value.trim())
      .map(([platform, value]) => ({ platform, value: value.trim() }));

    const education: AdminEducationEntry[] = form.education
      .filter((row) => row.institution.trim() || row.degree.trim() || row.start_year)
      .map((row) => ({
        institution: row.institution.trim(),
        degree: row.degree.trim(),
        start_year: Number(row.start_year),
        end_year: row.end_year ? Number(row.end_year) : null,
        honours: row.honours.trim() || null,
      }));

    const experience: AdminExperienceEntry[] = form.experience
      .filter((row) => row.title.trim() || row.company.trim() || row.start_date)
      .map((row) => ({
        title: row.title.trim(),
        company: row.company.trim(),
        start_date: row.start_date,
        end_date: row.end_date || null,
        location: row.location.trim() || null,
      }));

    const achievements: AdminAchievementEntry[] = form.achievements
      .filter((row) => row.title.trim() || row.issuer.trim() || row.date)
      .map((row) => ({
        title: row.title.trim(),
        issuer: row.issuer.trim() || null,
        date: row.date || null,
      }));

    return {
      professionalTitle: form.title,
      organization: form.organisation,
      roleDescription: form.role_description,
      bio: form.bio,
      location: form.location,
      phone: form.phone,
      whatsapp: form.whatsapp_phone,
      seeking: form.seeking,
      offering: form.offering,
      dateOfBirth: form.date_of_birth,
      gender: form.gender,
      interests: form.interests
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      socialLinks: links,
      education,
      experience,
      achievements,
      sendWelcomeEmail: form.send_welcome_email,
      markOnboardingComplete: form.onboarding_completed,
    };
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
      send_welcome_email: form.send_welcome_email,
    };

    if (mode === "create") {
      let userId = createdUserId;

      if (!userId) {
        const created = await registerUser({
          ...common,
          password: form.password,
          password_confirmation: form.password_confirmation,
        });

        if (!created.ok) {
          setSaving(false);
          setError(created.error);
          return;
        }

        userId = created.userId;
        setCreatedUserId(userId);
      }

      const profileResult = await updateUser(userId, buildProfileUpdates());
      if (!profileResult.ok) {
        setSaving(false);
        setError(profileResult.error);
        return;
      }

      if (avatarFile) {
        const uploaded = await uploadAvatar(userId, avatarFile);
        if (!uploaded.ok) {
          setSaving(false);
          setError(uploaded.error);
          return;
        }
      }
    } else {
      const result = await updateUser(user!.id, {
        firstName: common.first_name,
        lastName: common.last_name,
        email: common.email,
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
        ...buildProfileUpdates(),
      });

      if (!result.ok) {
        setSaving(false);
        setError(result.error);
        return;
      }

      if (avatarFile) {
        const uploaded = await uploadAvatar(user!.id, avatarFile);
        if (!uploaded.ok) {
          setSaving(false);
          setError(uploaded.error);
          return;
        }
      }
    }

    setSaving(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "create" ? "Add User" : "Edit User"}
      description={
        mode === "create"
          ? "Create a member and optionally complete their profile in the same pass."
          : "Update login, access, membership and the full public profile."
      }
      className="max-w-3xl"
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

          <div className="flex items-center gap-4">
            {avatarPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarPreview}
                alt="Profile photo preview"
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-16 w-16 items-center justify-center rounded-full roicard-gradient text-sm font-bold text-roicard-on-primary">
                {`${form.first_name?.[0] ?? ""}${form.last_name?.[0] ?? ""}`.toUpperCase() || "U"}
              </span>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => handleAvatarFile(e.target.files?.[0])}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileRef.current?.click()}
            >
              <Camera className="h-3.5 w-3.5" aria-hidden />
              {avatarPreview ? "Change photo" : "Upload photo"}
            </Button>
          </div>

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
          <p className="text-xs text-roicard-text-muted">
            Set a temporary password and share it securely, or send the member a
            password-reset email from their detail panel. Plaintext passwords are
            never emailed.
          </p>
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
                  Checked: the member lands on the dashboard after sign-in.
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
            <label className="flex items-start gap-3 rounded-lg border border-roicard-border bg-roicard-bg-muted px-3 py-3 sm:col-span-2">
              <input
                type="checkbox"
                checked={form.send_welcome_email}
                onChange={(e) =>
                  setField("send_welcome_email", e.target.checked)
                }
                className="mt-0.5 h-4 w-4 rounded border-roicard-border"
              />
              <span>
                <span className="block text-sm font-medium text-roicard-text">
                  Send the welcome email when completion changes
                </span>
                <span className="block text-xs text-roicard-text-muted">
                  Off by default for admin actions. It is only ever sent once.
                </span>
              </span>
            </label>
          </div>
        </section>

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
            <Input
              label="Date of birth"
              type="date"
              value={form.date_of_birth}
              onChange={(e) => setField("date_of_birth", e.target.value)}
            />
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-roicard-text">
                Gender
              </label>
              <select
                value={form.gender}
                onChange={(e) => setField("gender", e.target.value)}
                className={selectClassName}
              >
                <option value="">Not specified</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>
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
          <Input
            label="Interests"
            hint="Comma-separated, e.g. Design, Technology, Finance."
            value={form.interests}
            onChange={(e) => setField("interests", e.target.value)}
          />

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-roicard-text-muted">
              Social links
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {SOCIAL_PLATFORMS.map((platform) => (
                <Input
                  key={platform}
                  label={platform[0].toUpperCase() + platform.slice(1)}
                  value={form.social[platform]}
                  placeholder="https://"
                  onChange={(e) => setSocial(platform, e.target.value)}
                />
              ))}
            </div>
          </div>
        </section>

      </div>
    </Modal>
  );
}
