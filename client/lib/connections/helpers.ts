/**
 * Connection list helpers — search, sort, and pagination.
 */

import type {
  Connection,
  ConnectionPerson,
  ConnectionSortOption,
  IncomingConnectionRequest,
} from "@/lib/connections/types";

/** Full display name from person fields. */
export function getPersonFullName(person: ConnectionPerson): string {
  return `${person.firstName} ${person.lastName}`.trim();
}

/** Avatar initials fallback when no profile photo exists. */
export function getPersonInitials(person: ConnectionPerson): string {
  return getPersonFullName(person)
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** Formats ISO date for card display. */
export function formatConnectionDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Filters connections by name, title, or organization. */
export function filterConnections(
  connections: Connection[],
  query: string
): Connection[] {
  const q = query.trim().toLowerCase();
  if (!q) return connections;

  return connections.filter((connection) => {
    const { person } = connection;
    const haystack = [
      getPersonFullName(person),
      person.professionalTitle,
      person.organization,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  });
}

/** Sorts connections by selected option. */
export function sortConnections(
  connections: Connection[],
  sort: ConnectionSortOption
): Connection[] {
  const sorted = [...connections];

  switch (sort) {
    case "oldest":
      return sorted.sort(
        (a, b) =>
          new Date(a.connectedAt).getTime() - new Date(b.connectedAt).getTime()
      );
    case "name_az":
      return sorted.sort((a, b) =>
        getPersonFullName(a.person).localeCompare(getPersonFullName(b.person))
      );
    case "most_recent":
    default:
      return sorted.sort(
        (a, b) =>
          new Date(b.connectedAt).getTime() - new Date(a.connectedAt).getTime()
      );
  }
}

/** Returns a page slice for pagination. */
export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

/** Total pages for pagination controls. */
export function getTotalPages(count: number, pageSize: number): number {
  return Math.max(1, Math.ceil(count / pageSize));
}

/** Sorts requests by most recent first. */
export function sortRequests(
  requests: IncomingConnectionRequest[]
): IncomingConnectionRequest[] {
  return [...requests].sort(
    (a, b) =>
      new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
  );
}
