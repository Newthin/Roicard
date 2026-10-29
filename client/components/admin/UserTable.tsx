/**
 * UserTable
 *
 * Admin user management table with search, status filter, pagination and
 * per-user actions. Membership state (paid/active) and account access
 * (can sign in) are separate controls — suspending an account never silently
 * deactivates the membership.
 */

"use client";

import {
  DataTable,
  DataTableCell,
  DataTableRow,
} from "@/components/admin/DataTable";
import { useAdmin } from "@/components/admin/AdminProvider";
import { AdminUserDetailModal } from "@/components/admin/AdminUserDetailModal";
import { AdminUserFormModal } from "@/components/admin/AdminUserFormModal";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import type { AdminUser, UserStatus } from "@/lib/admin/types";
import { Printer, Search, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 20;

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

function FlagBadge({
  tone,
  children,
  title,
}: {
  tone: "green" | "amber" | "red" | "neutral";
  children: React.ReactNode;
  title?: string;
}) {
  const tones = {
    green: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    red: "border-red-500/30 bg-red-500/10 text-red-400",
    neutral: "border-roicard-border bg-roicard-bg-muted text-roicard-text-muted",
  } as const;

  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        tones[tone]
      )}
    >
      {children}
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

export function UserTable() {
  const { users, isLoading, updateUser, deleteUser } = useAdmin();
  const { confirm } = useConfirm();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | UserStatus>("all");
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [page, setPage] = useState(1);
  const [viewUser, setViewUser] = useState<AdminUser | null>(null);
  const [formState, setFormState] = useState<{
    mode: "create" | "edit";
    user: AdminUser | null;
  } | null>(null);

  /** Toggle membership activation (paid/active state). */
  const handleMembership = async (user: AdminUser) => {
    const activating = user.status !== "active";
    const confirmed = await confirm({
      title: activating ? "Activate membership?" : "Deactivate membership?",
      description: activating
        ? `Mark ${user.firstName} ${user.lastName} as an active member and publish their public profile. This is an admin override and does not create a payment record.`
        : `Return ${user.firstName} ${user.lastName} to draft and hide their public profile. They can still sign in.`,
      confirmLabel: activating ? "Activate" : "Deactivate",
      variant: activating ? "primary" : "danger",
    });

    if (!confirmed) return;
    const result = await updateUser(user.id, {
      status: activating ? "active" : "draft",
    });
    if (!result.ok) alert(result.error);
  };

  /** Toggle sign-in access. Never changes the membership state. */
  const handleAccess = async (user: AdminUser) => {
    const suspending = !user.isDeactivated;
    const confirmed = await confirm({
      title: suspending ? "Suspend account access?" : "Restore account access?",
      description: suspending
        ? `${user.firstName} ${user.lastName} will be signed out everywhere and blocked from signing in. Their membership and payment history are unchanged.`
        : `${user.firstName} ${user.lastName} will be able to sign in again.`,
      confirmLabel: suspending ? "Suspend" : "Restore",
      variant: suspending ? "danger" : "primary",
    });

    if (!confirmed) return;
    const result = await updateUser(user.id, {
      accessState: suspending ? "suspended" : "active",
    });
    if (!result.ok) alert(result.error);
  };

  /** Delete user (soft-delete, retained for the data retention window). */
  const handleDelete = async (user: AdminUser) => {
    const confirmed = await confirm({
      title: "Delete user account?",
      description: `${user.firstName} ${user.lastName}'s account will be deactivated immediately and retained for the data retention period before being permanently removed.`,
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
        statusFilter === "all" ||
        (statusFilter === "suspended"
          ? u.isDeactivated
          : u.status === statusFilter && !u.isDeactivated);
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
        onClick={() => setFormState({ mode: "edit", user })}
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
      <Button
        variant="ghost"
        size="sm"
        className={user.status === "active" ? "text-amber-400" : "text-emerald-400"}
        onClick={() => handleMembership(user)}
      >
        {user.status === "active" ? "Deactivate" : "Activate"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={user.isDeactivated ? "text-emerald-400" : "text-red-400"}
        onClick={() => handleAccess(user)}
      >
        {user.isDeactivated ? "Restore" : "Suspend"}
      </Button>
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
            <option value="active">Active membership</option>
            <option value="draft">Draft membership</option>
            <option value="suspended">Suspended access</option>
          </select>
          <Button
            onClick={() => setFormState({ mode: "create", user: null })}
            className="shrink-0"
          >
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
            { key: "discount", label: "Discount" },
            { key: "status", label: "State" },
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
                {user.campaignCode ? (
                  <span className="inline-flex items-center rounded-full border border-roicard-accent/40 bg-roicard-accent/15 px-2.5 py-0.5 text-xs font-semibold text-roicard-accent">
                    {user.campaignCode}
                  </span>
                ) : (
                  <span className="text-roicard-text-muted">—</span>
                )}
              </DataTableCell>
              <DataTableCell>
                <div className="flex flex-wrap gap-1">
                  <StatusBadge status={user.status} />
                  {user.isDeactivated && (
                    <FlagBadge tone="red" title="Account access suspended">
                      suspended
                    </FlagBadge>
                  )}
                  {user.onboardingCompleted ? (
                    <FlagBadge tone="neutral" title="Onboarding completed">
                      onboarded
                    </FlagBadge>
                  ) : (
                    <FlagBadge tone="amber" title="Still needs onboarding">
                      onboarding
                    </FlagBadge>
                  )}
                </div>
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
                <UserAvatar
                  firstName={user.firstName}
                  lastName={user.lastName}
                  photoUrl={user.profilePhotoUrl}
                />
                <div className="min-w-0">
                  <p className="font-medium text-roicard-text">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-sm text-roicard-text-muted">
                    {user.email}
                  </p>
                  <p className="text-xs text-roicard-text-muted">
                    @{user.username || "no profile yet"}
                  </p>
                </div>
              </div>
              <StatusBadge status={user.status} />
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {user.isDeactivated && (
                <FlagBadge tone="red">access suspended</FlagBadge>
              )}
              {!user.onboardingCompleted && (
                <FlagBadge tone="amber">onboarding pending</FlagBadge>
              )}
            </div>
            <p className="mt-2 text-xs text-roicard-text-muted">
              Joined {new Date(user.joinedAt).toLocaleDateString()}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setViewUser(user)}
              >
                View
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setFormState({ mode: "edit", user })}
              >
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
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleMembership(user)}
              >
                {user.status === "active" ? "Deactivate membership" : "Activate membership"}
              </Button>
              <Button
                variant={user.isDeactivated ? "secondary" : "danger"}
                size="sm"
                onClick={() => handleAccess(user)}
              >
                {user.isDeactivated ? "Restore access" : "Suspend access"}
              </Button>
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

      <AdminUserDetailModal
        user={viewUser}
        onClose={() => setViewUser(null)}
        onEdit={(user) => {
          setViewUser(null);
          setFormState({ mode: "edit", user });
        }}
      />

      <AdminUserFormModal
        isOpen={!!formState}
        mode={formState?.mode ?? "create"}
        user={formState?.user ?? null}
        onClose={() => setFormState(null)}
      />
    </div>
  );
}
