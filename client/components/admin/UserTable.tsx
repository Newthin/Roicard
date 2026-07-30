/**
 * UserTable
 *
 * Admin user management table with search, status filter, and pagination.
 * View/Edit/Suspend/Activate actions open modals or update mock state.
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
import { cn } from "@/lib/cn";
import type { AdminUser, UserStatus } from "@/lib/admin/types";
import { useEffect, useMemo, useState } from "react";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 20;

const COLUMNS = [
  { key: "name", label: "User Name" },
  { key: "email", label: "Email" },
  { key: "username", label: "Username" },
  { key: "status", label: "Status" },
  { key: "joined", label: "Join Date" },
  { key: "actions", label: "Actions", className: "text-right" },
];

function StatusBadge({ status }: { status: UserStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        status === "active"
          ? "bg-emerald-500/15 text-emerald-400"
          : status === "draft"
            ? "bg-amber-500/15 text-amber-400"
            : "bg-red-500/15 text-red-400"
      )}
    >
      {status}
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
      description={`@${user.username}`}
    >
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-roicard-text-muted">Name</dt>
          <dd className="text-roicard-text">
            {user.firstName} {user.lastName}
          </dd>
        </div>
        <div>
          <dt className="text-roicard-text-muted">Email</dt>
          <dd className="text-roicard-text">{user.email}</dd>
        </div>
        <div>
          <dt className="text-roicard-text-muted">Title</dt>
          <dd className="text-roicard-text">{user.professionalTitle}</dd>
        </div>
        <div>
          <dt className="text-roicard-text-muted">Organization</dt>
          <dd className="text-roicard-text">{user.organization}</dd>
        </div>
        <div>
          <dt className="text-roicard-text-muted">Status</dt>
          <dd>
            <StatusBadge status={user.status} />
          </dd>
        </div>
        <div>
          <dt className="text-roicard-text-muted">Joined</dt>
          <dd className="text-roicard-text">
            {new Date(user.joinedAt).toLocaleDateString()}
          </dd>
        </div>
      </dl>
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

  /** Reset form when a different user is opened for editing. */
  useEffect(() => {
    setForm({});
  }, [user?.id]);

  const current = user ? { ...user, ...form } : null;

  if (!user || !current) return null;

  const handleSave = async () => {
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
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="First Name"
            value={current.firstName}
            onChange={(e) =>
              setForm((f) => ({ ...f, firstName: e.target.value }))
            }
          />
          <Input
            label="Last Name"
            value={current.lastName}
            onChange={(e) =>
              setForm((f) => ({ ...f, lastName: e.target.value }))
            }
          />
        </div>
        <Input
          label="Email"
          type="email"
          value={current.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        />
        <Input
          label="Username"
          value={current.username}
          onChange={(e) =>
            setForm((f) => ({ ...f, username: e.target.value }))
          }
        />
        <Input
          label="Professional Title"
          value={current.professionalTitle}
          onChange={(e) =>
            setForm((f) => ({ ...f, professionalTitle: e.target.value }))
          }
        />
        <Input
          label="Organization"
          value={current.organization}
          onChange={(e) =>
            setForm((f) => ({ ...f, organization: e.target.value }))
          }
        />
      </div>
    </Modal>
  );
}

export function UserTable() {
  const { users, isLoading, updateUserStatus, updateUser } = useAdmin();
  const { confirm } = useConfirm();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | UserStatus>("all");
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [page, setPage] = useState(1);
  const [viewUser, setViewUser] = useState<AdminUser | null>(null);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);

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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Search by name, email, or username..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="sm:max-w-xs"
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as "all" | UserStatus);
            setPage(1);
          }}
          className="h-11 rounded-lg border border-roicard-border bg-roicard-bg-muted px-4 text-sm text-roicard-text"
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <DataTable columns={COLUMNS}>
          {paginated.map((user) => (
            <DataTableRow key={user.id}>
              <DataTableCell className="font-medium text-roicard-text">
                {user.firstName} {user.lastName}
              </DataTableCell>
              <DataTableCell>{user.email}</DataTableCell>
              <DataTableCell>@{user.username}</DataTableCell>
              <DataTableCell>
                <StatusBadge status={user.status} />
              </DataTableCell>
              <DataTableCell>
                {new Date(user.joinedAt).toLocaleDateString()}
              </DataTableCell>
              <DataTableCell className="text-right">
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
                </div>
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
              <div>
                <p className="font-medium text-roicard-text">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-sm text-roicard-text-muted">{user.email}</p>
                <p className="text-xs text-roicard-text-muted">
                  @{user.username}
                </p>
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
        <div className="flex flex-col gap-3 border-t border-roicard-border pt-4 sm:flex-row sm:items-center sm:justify-between">
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
              className="h-8 rounded-lg border border-roicard-border bg-roicard-bg-muted px-2 text-xs text-roicard-text"
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
    </div>
  );
}
