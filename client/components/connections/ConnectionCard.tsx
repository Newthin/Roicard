/**
 * ConnectionCard
 *
 * Displays an established connection with profile info and date connected.
 *
 * Props:
 * - connection: Connection record from storage
 */

import { ConnectionAvatar } from "@/components/connections/ConnectionAvatar";
import {
  formatConnectionDate,
  getPersonFullName,
} from "@/lib/connections/helpers";
import type { Connection, ConnectionPerson } from "@/lib/connections/types";
import Link from "next/link";

type ConnectionCardProps = {
  connection: Connection;
  onViewGuest?: (person: ConnectionPerson) => void;
};

export function ConnectionCard({
  connection,
  onViewGuest,
}: ConnectionCardProps) {
  const { person } = connection;
  const fullName = getPersonFullName(person);

  const cardContent = (
    <article className="glass-card flex items-center gap-4 rounded-2xl p-4 transition-colors hover:border-roicard-accent/25 sm:p-5">
      <ConnectionAvatar person={person} size="lg" />

      <div className="min-w-0 flex-1">
        <h3 className="truncate font-semibold text-roicard-text">{fullName}</h3>
        <p className="mt-0.5 truncate text-sm text-roicard-text-muted">
          {person.professionalTitle}
        </p>
        {person.organization && (
          <p className="truncate text-sm text-roicard-text-muted/80">
            {person.organization}
          </p>
        )}
        <p className="mt-2 text-xs text-roicard-accent">
          Connected {formatConnectionDate(connection.connectedAt)}
        </p>
      </div>
    </article>
  );

  if (person.username) {
    return (
      <Link href={`/${person.username}`} className="block">
        {cardContent}
      </Link>
    );
  }

  if (onViewGuest) {
    return (
      <button
        type="button"
        onClick={() => onViewGuest(person)}
        className="block w-full text-left"
        title="View guest profile"
      >
        {cardContent}
      </button>
    );
  }

  return cardContent;
}
