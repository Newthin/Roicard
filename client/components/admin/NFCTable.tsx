/**
 * NFCTable
 *
 * NFC card assignment management with assign/reassign/remove modals
 * and register-new-card workflow.
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
import type { NFCCard } from "@/lib/admin/types";
import { Plus } from "lucide-react";
import { useState } from "react";

const COLUMNS = [
  { key: "cardId", label: "Roicard ID" },
  { key: "user", label: "Assigned User" },
  { key: "status", label: "Status" },
  { key: "date", label: "Date Assigned" },
  { key: "actions", label: "Actions", className: "text-right" },
];

function NfcStatusBadge({ status }: { status: NFCCard["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        status === "active"
          ? "bg-roicard-accent/15 text-roicard-accent"
          : status === "assigned"
            ? "bg-roicard-primary/15 text-roicard-primary"
            : status === "deactivated"
              ? "bg-red-500/15 text-red-400"
              : "bg-roicard-bg-muted text-roicard-text-muted"
      )}
    >
      {status}
    </span>
  );
}

/** Modal workflow for assigning or reassigning an NFC card to a user. */
function AssignNfcModal({
  card,
  onClose,
  onAssign,
}: {
  card: NFCCard | null;
  onClose: () => void;
  onAssign: (nfcId: string, userId: string) => void;
}) {
  const { users } = useAdmin();
  const { confirm } = useConfirm();
  const [selectedUserId, setSelectedUserId] = useState("");

  if (!card) return null;

  const activeUsers = users.filter((u) => u.status === "active");
  const isReassign = card.status === "assigned";

  const handleSubmit = async () => {
    if (!selectedUserId) return;

    const user = activeUsers.find((u) => u.id === selectedUserId);
    const confirmed = await confirm({
      title: isReassign ? "Reassign Roicard?" : "Assign Roicard?",
      description: user
        ? `${isReassign ? "Reassign" : "Assign"} ${card.cardId} to ${user.firstName} ${user.lastName}.`
        : undefined,
      confirmLabel: isReassign ? "Reassign" : "Assign",
    });

    if (!confirmed) return;

    onAssign(card.id, selectedUserId);
    setSelectedUserId("");
    onClose();
  };

  return (
    <Modal
      isOpen={!!card}
      onClose={() => {
        setSelectedUserId("");
        onClose();
      }}
      title={isReassign ? "Reassign Roicard" : "Assign Roicard"}
      description={card.cardId}
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => {
              setSelectedUserId("");
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedUserId}>
            {isReassign ? "Reassign" : "Assign"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {isReassign && (
          <p className="text-sm text-roicard-text-muted">
            Currently assigned to:{" "}
            <span className="text-roicard-text">{card.assignedUserName}</span>
          </p>
        )}
        <div className="space-y-2">
          <label
            htmlFor="nfc-user-select"
            className="block text-sm font-medium text-roicard-text"
          >
            Select User
          </label>
          <select
            id="nfc-user-select"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="h-11 w-full rounded-lg border border-roicard-border bg-roicard-bg-muted px-4 text-sm text-roicard-text"
          >
            <option value="">Choose a user...</option>
            {activeUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.firstName} {u.lastName} (@{u.username})
              </option>
            ))}
          </select>
        </div>
      </div>
    </Modal>
  );
}

/** Modal for registering a new NFC card into the platform inventory. */
function RegisterNfcModal({
  isOpen,
  onClose,
  onRegister,
}: {
  isOpen: boolean;
  onClose: () => void;
  onRegister: (cardId: string) => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const { confirm } = useConfirm();
  const [cardId, setCardId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setCardId("");
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    const trimmed = cardId.trim();
    if (!trimmed) return;

    const confirmed = await confirm({
      title: "Register NFC card?",
      description: `Add ${trimmed} to the ROICARD NFC inventory.`,
      confirmLabel: "Register Card",
    });

    if (!confirmed) return;

    const result = await onRegister(cardId);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    handleClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Register Roicard"
      description="Add a new physical Roicard to the Roicard system"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!cardId.trim()}>
            Register Roicard
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Roicard ID"
          placeholder="e.g. NFC-ROIC-006"
          value={cardId}
          onChange={(e) => {
            setCardId(e.target.value);
            setError(null);
          }}
          hint="Enter the unique ID printed on or encoded in the physical Roicard."
          error={error ?? undefined}
        />
      </div>
    </Modal>
  );
}

export function NFCTable() {
  const {
    nfcCards,
    isLoading,
    assignNfc,
    unassignNfc,
    activateNfc,
    deactivateNfc,
    registerNfcCard,
  } = useAdmin();
  const { confirm } = useConfirm();
  const [assignCard, setAssignCard] = useState<NFCCard | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);

  /** Remove NFC assignment after admin confirmation. */
  const handleRemoveAssignment = async (card: NFCCard) => {
    const confirmed = await confirm({
      title: "Remove NFC assignment?",
      description: card.assignedUserName
        ? `Unassign ${card.cardId} from ${card.assignedUserName}.`
        : `Remove assignment for ${card.cardId}.`,
      confirmLabel: "Remove",
      variant: "danger",
    });

    if (!confirmed) return;
    unassignNfc(card.id);
  };

  const handleActivate = async (card: NFCCard) => {
    const confirmed = await confirm({
      title: "Activate Roicard?",
      description: `Set ${card.cardId} as active for ${card.assignedUserName ?? "the assigned member"}.`,
      confirmLabel: "Activate",
    });
    if (!confirmed) return;
    activateNfc(card.id);
  };

  const handleDeactivate = async (card: NFCCard) => {
    const confirmed = await confirm({
      title: "Deactivate Roicard?",
      description: `Remove ${card.cardId} from circulation. The holder is kept on record.`,
      confirmLabel: "Deactivate",
      variant: "danger",
    });
    if (!confirmed) return;
    deactivateNfc(card.id);
  };

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
        <p className="text-sm text-roicard-text-muted">
          {nfcCards.length} card{nfcCards.length === 1 ? "" : "s"} in system
        </p>
        <Button onClick={() => setRegisterOpen(true)}>
          <Plus className="h-4 w-4" />
          Register Roicard
        </Button>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <DataTable columns={COLUMNS}>
          {nfcCards.map((card) => (
            <DataTableRow key={card.id}>
              <DataTableCell className="font-mono font-medium text-roicard-text">
                {card.cardId}
              </DataTableCell>
              <DataTableCell>
                {card.assignedUserName ?? "—"}
              </DataTableCell>
              <DataTableCell>
                <NfcStatusBadge status={card.status} />
              </DataTableCell>
              <DataTableCell>
                {card.assignedAt
                  ? new Date(card.assignedAt).toLocaleDateString()
                  : "—"}
              </DataTableCell>
              <DataTableCell className="text-right">
                <div className="flex flex-wrap justify-end gap-1">
                  {(card.status === "available" || card.status === "deactivated") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAssignCard(card)}
                    >
                      Assign
                    </Button>
                  )}
                  {card.status === "assigned" && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAssignCard(card)}
                      >
                        Reassign
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleActivate(card)}
                      >
                        Activate
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400"
                        onClick={() => handleRemoveAssignment(card)}
                      >
                        Remove
                      </Button>
                    </>
                  )}
                  {card.status === "active" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400"
                      onClick={() => handleDeactivate(card)}
                    >
                      Deactivate
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
        {nfcCards.map((card) => (
          <div
            key={card.id}
            className="rounded-xl border border-roicard-border bg-roicard-bg-elevated p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-mono font-medium text-roicard-text">{card.cardId}</p>
              <NfcStatusBadge status={card.status} />
            </div>
            <p className="mt-2 text-sm text-roicard-text-muted">
              {card.assignedUserName ?? "Unassigned"}
            </p>
            {card.assignedAt && (
              <p className="text-xs text-roicard-text-muted">
                Assigned {new Date(card.assignedAt).toLocaleDateString()}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {(card.status === "available" || card.status === "deactivated") && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setAssignCard(card)}
                >
                  Assign
                </Button>
              )}
              {card.status === "assigned" && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setAssignCard(card)}
                  >
                    Reassign
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleActivate(card)}
                  >
                    Activate
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleRemoveAssignment(card)}
                  >
                    Remove
                  </Button>
                </>
              )}
              {card.status === "active" && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDeactivate(card)}
                >
                  Deactivate
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <AssignNfcModal
        card={assignCard}
        onClose={() => setAssignCard(null)}
        onAssign={assignNfc}
      />
      <RegisterNfcModal
        isOpen={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onRegister={registerNfcCard}
      />
    </div>
  );
}
