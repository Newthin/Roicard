/**
 * GuestProfileModal
 *
 * Displays the information a guest submitted when they sent a connection
 * request (Guest Profile). If the guest has since created a ROICARD account,
 * the linked profile username is available so the owner can open their real
 * public profile.
 */

"use client";

import { ConnectionAvatar } from "@/components/connections/ConnectionAvatar";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { getPersonFullName } from "@/lib/connections/helpers";
import type { ConnectionPerson } from "@/lib/connections/types";
import { AtSign, Building2, Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";

type GuestProfileModalProps = {
  person: ConnectionPerson | null;
  isOpen: boolean;
  onClose: () => void;
};

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-roicard-bg-muted text-roicard-accent">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-roicard-text-muted">{label}</p>
        <p className="truncate text-sm font-medium text-roicard-text">{value}</p>
      </div>
    </div>
  );
}

export function GuestProfileModal({
  person,
  isOpen,
  onClose,
}: GuestProfileModalProps) {
  const fullName = person ? getPersonFullName(person) : "";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Guest Profile"
      description="Contact details shared when this request was sent"
    >
      {person && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 rounded-xl border border-roicard-border bg-roicard-bg-muted p-4">
            <ConnectionAvatar person={person} size="lg" />
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-roicard-text">
                {fullName}
              </h3>
              <p className="text-sm text-roicard-text-muted">
                Guest connection
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <DetailRow
              icon={<Mail className="h-4 w-4" />}
              label="Email"
              value={person.email || "Not provided"}
            />
            <DetailRow
              icon={<Phone className="h-4 w-4" />}
              label="Phone"
              value={person.phone || "Not provided"}
            />
            <DetailRow
              icon={<Building2 className="h-4 w-4" />}
              label="Organization"
              value={person.organization || "Not provided"}
            />
            <DetailRow
              icon={<MapPin className="h-4 w-4" />}
              label="Where you met"
              value={person.meetingContext || "Not provided"}
            />
            <DetailRow
              icon={<AtSign className="h-4 w-4" />}
              label="Account status"
              value={person.guestUserId ? "Has a ROICARD profile" : "No account yet"}
            />
          </div>

          {person.introduction && (
            <div className="rounded-xl border border-roicard-border bg-roicard-primary/5 p-4">
              <p className="text-xs font-medium text-roicard-text-muted">
                About {person.firstName}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-roicard-text whitespace-pre-line">
                {person.introduction}
              </p>
            </div>
          )}

          {person.intent && (
            <div className="rounded-xl border border-roicard-accent/30 bg-roicard-accent/5 p-4">
              <p className="text-xs font-medium text-roicard-text-muted">
                Why they want to connect
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-roicard-text whitespace-pre-line">
                {person.intent}
              </p>
            </div>
          )}

          {person.guestUserId && (
            <p className="rounded-lg bg-roicard-primary/10 px-3 py-2.5 text-xs text-roicard-accent">
              This guest now has a ROICARD account — you can view their full
              public profile.
            </p>
          )}
        </div>
      )}
      {person?.guestUserId && person.username && (
        <Link
          href={`/${person.username}`}
          onClick={onClose}
          className="inline-flex"
        >
          <Button>View full profile</Button>
        </Link>
      )}
    </Modal>
  );
}
