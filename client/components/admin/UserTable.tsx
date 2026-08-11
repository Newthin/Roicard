/**
 * UserTable
 *
 * Admin user management table with search, status filter, pagination, and
 * per-user actions. View/Edit/Suspend/Activate use the shared Modal + Confirm
 * components; "Card" opens the printable business-card view.
 */

"use client";

import {
  DataTable,
  DataTableCell,
  DataTableRow,
} from "@/components/admin/DataTable";
import { useAdmin } from "@/components/admin/AdminProvider";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PasswordStrengthChecklist } from "@/components/ui/PasswordStrengthChecklist";
import { cn } from "@/lib/cn";
import type { AdminUser, UserStatus } from "@/lib/admin/types";
import { arePasswordRulesMet } from "@/lib/validation/password";
import { Printer, Search, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 20;

const selectClassName =
  "h-11 w-full rounded-lg border border-roicard-border bg-roicard-bg-muted px-4 text-sm text-roicard-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-roicard-accent/50 focus-visible:border-roicard-accent/50";

function StatusBadge({ status }: { status: UserStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        status === "active"
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
          : status === "draft"
            ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
            : "border-red-500/30 bg-red-500/10 text-red-400"
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "active"
            ? "bg-emerald-400"
            : status === "draft"
              ? "bg-amber-400"
              : "bg-red-400"
        )}
        aria-hidden
      />
      {status}
    </span>
  );
}

function UserAvatar({
  firstName,
  lastName,
  photoUrl,
}: {
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
}) {
  if (photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={photoUrl}
        alt={`${firstName} ${lastName}`}
        className="h-9 w-9 shrink-0 rounded-full object-cover"
      />
    );
  }

  const initials =
    `${(firstName?.[0] ?? "").toUpperCase()}${(lastName?.[0] ?? "").toUpperCase()}` ||
    "U";
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full roicard-gradient text-xs font-bold text-roicard-on-primary">
      {initials}
    </span>
  );
}

/** Read-only user details modal. */
function ViewUserModal({
  user,
  onClose,
}: {
  user: AdminUser | null;
  onClose: () => void;
}) {
  if (!user) return null;

  return (
    <Modal
      isOpen={!!user}
      onClose={onClose}
      title="User Details"
      description={`@${user.username || "no profile yet"}`}
    >
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <UserAvatar firstName={user.firstName} lastName={user.lastName} photoUrl={user.profilePhotoUrl} />
          <div>
            <p className="text-base font-semibold text-roicard-text">
              {user.firstName} {user.lastName}
            </p>
            {user.professionalTitle && (
              <p className="text-sm text-roicard-text-muted">
                {user.professionalTitle}
              </p>
            )}
          </div>
        </div>

        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-roicard-text-muted">
              Email
            </dt>
            <dd className="mt-1 break-all text-sm text-roicard-text">
              {user.email}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-roicard-text-muted">
              Username
            </dt>
            <dd className="mt-1 text-sm text-roicard-text">
              {user.username ? `@${user.username}` : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-roicard-text-muted">
              Organization
            </dt>
            <dd className="mt-1 text-sm text-roicard-text">
              {user.organization || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-roicard-text-muted">
              Joined
            </dt>
            <dd className="mt-1 text-sm text-roicard-text">
              {new Date(user.joinedAt).toLocaleDateString()}
            </dd>
          </div>
        </dl>

        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-roicard-text-muted">
            Status
          </dt>
          <dd className="mt-1">
            <StatusBadge status={user.status} />
          </dd>
        </div>
      </div>
    </Modal>
  );
}

/** Edit user form modal — persists via AdminProvider. */
function EditUserModal({
  user,
  onClose,
  onSave,
}: {
  user: AdminUser | null;
  onClose: () => void;
  onSave: (id: string, updates: Partial<AdminUser>) => void;
}) {
  const { confirm } = useConfirm();
  const [form, setForm] = useState<Partial<AdminUser>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  /** Reset form when a different user is opened for editing. */
  useEffect(() => {
    setForm({});
    setErrors({});
  }, [user?.id]);

  const current = user ? { ...user, ...form } : null;

  if (!user || !current) return null;

  const setField = (field: keyof AdminUser, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSave = async () => {
    const nextErrors: Record<string, string> = {};
    if (!current.firstName.trim()) nextErrors.firstName = "First name is required";
    if (!current.lastName.trim()) nextErrors.lastName = "Last name is required";
    if (!current.email.trim()) {
      nextErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(current.email)) {
      nextErrors.email = "Enter a valid email address";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const confirmed = await confirm({
      title: "Save user changes?",
      description: `Update profile information for ${current.firstName} ${current.lastName}.`,
      confirmLabel: "Save Changes",
    });

    if (!confirmed) return;

    onSave(user.id, {
      firstName: current.firstName,
      lastName: current.lastName,
      email: current.email,
      username: current.username,
      professionalTitle: current.professionalTitle,
      organization: current.organization,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={!!user}
      onClose={onClose}
      title="Edit User"
      description="Update user profile information"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-roicard-accent">
            Name
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="First Name"
              value={current.firstName}
              error={errors.firstName}
              onChange={(e) => setField("firstName", e.target.value)}
            />
            <Input
              label="Last Name"
              value={current.lastName}
              error={errors.lastName}
              onChange={(e) => setField("lastName", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-roicard-accent">
            Profile
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Email"
              type="email"
              value={current.email}
              error={errors.email}
              onChange={(e) => setField("email", e.target.value)}
            />
            <Input
              label="Username"
              value={current.username}
              onChange={(e) => setField("username", e.target.value)}
            />
          </div>
          <Input
            label="Professional Title"
            value={current.professionalTitle}
            onChange={(e) => setField("professionalTitle", e.target.value)}
          />
          <Input
            label="Organization"
            value={current.organization}
            onChange={(e) => setField("organization", e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}

function AddUserModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { registerUser } = useAdmin();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    password_confirmation: "",
    status: "draft" as const,
    role: "member" as const,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
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
    if (!form.password) {
      next.password = "Password is required";
    } else if (!arePasswordRulesMet(form.password, form.password_confirmation)) {
      next.password = "Password doesn't meet the requirements below";
    }
    return next;
  };

  const handleSubmit = async () => {
    setError("");
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    const result = await registerUser(form);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
    } else {
      setForm({
        first_name: "",
        last_name: "",
        email: "",
        password: "",
        password_confirmation: "",
        status: "draft",
        role: "member",
      });
      setErrors({});
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add User"
      description="Create a new user account"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} isLoading={saving}>
            Create User
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

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-roicard-accent">
            Name
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="First Name"
              value={form.first_name}
              error={errors.first_name}
              onChange={(e) => handleChange("first_name", e.target.value)}
            />
            <Input
              label="Last Name"
              value={form.last_name}
              error={errors.last_name}
              onChange={(e) => handleChange("last_name", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-roicard-accent">
            Contact & Login
          </p>
          <Input
            label="Email"
            type="email"
            value={form.email}
            error={errors.email}
            onChange={(e) => handleChange("email", e.target.value)}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Input
                label="Password"
                type="password"
                value={form.password}
                error={errors.password}
                onChange={(e) => handleChange("password", e.target.value)}
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
              onChange={(e) =>
                handleChange("password_confirmation", e.target.value)
              }
            />
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-roicard-accent">
            Role & Status
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-roicard-text">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => handleChange("status", e.target.value)}
                className={selectClassName}
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-roicard-text">
                Role
              </label>
              <select
                value={form.role}
                onChange={(e) => handleChange("role", e.target.value)}
                className={selectClassName}
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function UserTable() {
  const { users, isLoading, updateUserStatus, updateUser, deleteUser } = useAdmin();
  const { confirm } = useConfirm();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | UserStatus>("all");
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [page, setPage] = useState(1);
  const [viewUser, setViewUser] = useState<AdminUser | null>(null);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  /** Suspend user after admin confirmation. */
  const handleSuspend = async (user: AdminUser) => {
    const confirmed = await confirm({
      title: "Suspend user?",
      description: `${user.firstName} ${user.lastName} will lose access until reactivated.`,
      confirmLabel: "Suspend",
      variant: "danger",
    });

    if (!confirmed) return;
    updateUserStatus(user.id, "suspended");
  };

  /** Activate user after admin confirmation. */
  const handleActivate = async (user: AdminUser) => {
    const confirmed = await confirm({
      title: "Activate user?",
      description: `Restore platform access for ${user.firstName} ${user.lastName}.`,
      confirmLabel: "Activate",
    });

    if (!confirmed) return;
    updateUserStatus(user.id, "active");
  };

  /** Permanently delete user after confirmation. */
  const handleDelete = async (user: AdminUser) => {
    const confirmed = await confirm({
      title: "Delete user account?",
      description: `This permanently deletes ${user.firstName} ${user.lastName}'s account, profile, payments, analytics, and connections. This cannot be undone.`,
      confirmLabel: "Delete Account",
      variant: "danger",
    });

    if (!confirmed) return;
    const result = await deleteUser(user.id);
    if (!result.ok) {
      alert(result.error);
    }
  };

  /** Filter users by search query and status — resets pagination on change. */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const matchesStatus =
        statusFilter === "all" || u.status === statusFilter;
      const matchesSearch =
        !q ||
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [users, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-roicard-border border-t-roicard-primary" />
      </div>
    );
  }

  const actionsFor = (user: AdminUser) => (
    <div className="flex flex-wrap justify-end gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setViewUser(user)}
      >
        View
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setEditUser(user)}
      >
        Edit
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-roicard-accent"
        disabled={!user.username}
        title={
          user.username
            ? "Generate printable card"
            : "No public profile yet — complete onboarding first"
        }
        onClick={() => router.push(`/admin/users/card/${user.id}`)}
      >
        <Printer className="h-3.5 w-3.5" aria-hidden />
        Card
      </Button>
      {user.status === "active" ? (
        <Button
          variant="ghost"
          size="sm"
          className="text-red-400"
          onClick={() => handleSuspend(user)}
        >
          Suspend
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="text-emerald-400"
          onClick={() => handleActivate(user)}
        >
          Activate
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="text-red-500"
        onClick={() => handleDelete(user)}
      >
        Delete
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:max-w-xs">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-roicard-text-muted"
              aria-hidden
            />
            <Input
              placeholder="Search by name, email, or username..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <p className="text-sm text-roicard-text-muted">
            {filtered.length} {filtered.length === 1 ? "user" : "users"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as "all" | UserStatus);
              setPage(1);
            }}
            className="h-11 rounded-lg border border-roicard-border bg-roicard-bg-muted px-4 text-sm text-roicard-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-roicard-accent/50 focus-visible:border-roicard-accent/50"
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="suspended">Suspended</option>
          </select>
          <Button onClick={() => setShowAddModal(true)} className="shrink-0">
            <UserPlus className="h-4 w-4" aria-hidden />
            Add User
          </Button>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <DataTable
          columns={[
            { key: "name", label: "User" },
            { key: "email", label: "Email" },
            { key: "username", label: "Username" },
            { key: "status", label: "Status" },
            { key: "joined", label: "Joined" },
            { key: "actions", label: "Actions", className: "text-right" },
          ]}
        >
          {paginated.map((user) => (
            <DataTableRow key={user.id}>
              <DataTableCell>
                <div className="flex items-center gap-3">
                  <UserAvatar
                    firstName={user.firstName}
                    lastName={user.lastName}
                    photoUrl={user.profilePhotoUrl}
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-roicard-text">
                      {user.firstName} {user.lastName}
                    </p>
                    {user.professionalTitle && (
                      <p className="truncate text-xs text-roicard-text-muted">
                        {user.professionalTitle}
                      </p>
                    )}
                  </div>
                </div>
              </DataTableCell>
              <DataTableCell className="break-all">
                {user.email}
              </DataTableCell>
              <DataTableCell>
                {user.username ? (
                  <span className="text-roicard-text">
                    @{user.username}
                  </span>
                ) : (
                  <span className="text-roicard-text-muted">—</span>
                )}
              </DataTableCell>
              <DataTableCell>
                <StatusBadge status={user.status} />
              </DataTableCell>
              <DataTableCell className="whitespace-nowrap">
                {new Date(user.joinedAt).toLocaleDateString()}
              </DataTableCell>
              <DataTableCell className="text-right">
                {actionsFor(user)}
              </DataTableCell>
            </DataTableRow>
          ))}
        </DataTable>
      </div>

      {/* Mobile card layout */}
      <div className="space-y-3 md:hidden">
        {paginated.map((user) => (
          <div
            key={user.id}
            className="rounded-xl border border-roicard-border bg-roicard-bg-elevated p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
          <UserAvatar firstName={user.firstName} lastName={user.lastName} photoUrl={user.profilePhotoUrl} />
                <div className="min-w-0">
                  <p className="font-medium text-roicard-text">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-sm text-roicard-text-muted">
                    {user.email}
                  </p>
                  <p className="text-xs text-roicard-text-muted">
                    @{user.username}
                  </p>
                </div>
              </div>
              <StatusBadge status={user.status} />
            </div>
            <p className="mt-2 text-xs text-roicard-text-muted">
              Joined {new Date(user.joinedAt).toLocaleDateString()}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => setViewUser(user)}>
                View
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setEditUser(user)}>
                Edit
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="text-roicard-accent"
                disabled={!user.username}
                onClick={() => router.push(`/admin/users/card/${user.id}`)}
              >
                <Printer className="h-3.5 w-3.5" aria-hidden />
                Card
              </Button>
              {user.status === "active" ? (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleSuspend(user)}
                >
                  Suspend
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleActivate(user)}
                >
                  Activate
                </Button>
              )}
              <Button
                variant="danger"
                size="sm"
                className="border-red-500/40 text-red-400"
                onClick={() => handleDelete(user)}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-roicard-text-muted">
          No users match your filters.
        </p>
      )}

      {/* Pagination controls */}
      {filtered.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-roicard-border bg-roicard-bg-elevated px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <p className="text-sm text-roicard-text-muted whitespace-nowrap">
              Showing {(safePage - 1) * pageSize + 1}–
              {Math.min(safePage * pageSize, filtered.length)} of{" "}
              {filtered.length}
            </p>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="h-8 rounded-lg border border-roicard-border bg-roicard-bg-muted px-2 text-xs text-roicard-text focus-visible:outline-none"
              aria-label="Rows per page"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
              <option value={filtered.length}>All</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <ViewUserModal user={viewUser} onClose={() => setViewUser(null)} />
      <EditUserModal
        user={editUser}
        onClose={() => setEditUser(null)}
        onSave={updateUser}
      />
      <AddUserModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </div>
  );
}
