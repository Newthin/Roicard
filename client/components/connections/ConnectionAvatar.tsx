/**
 * ConnectionAvatar
 *
 * Reusable profile photo or initials avatar for connection UI.
 *
 * Props:
 * - person: ConnectionPerson data
 * - size: sm | md | lg
 */

import {
  getPersonFullName,
  getPersonInitials,
} from "@/lib/connections/helpers";
import type { ConnectionPerson } from "@/lib/connections/types";
import { cn } from "@/lib/cn";

type ConnectionAvatarProps = {
  person: ConnectionPerson;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClasses = {
  sm: "h-10 w-10 text-sm",
  md: "h-12 w-12 text-sm",
  lg: "h-14 w-14 text-base",
};

export function ConnectionAvatar({
  person,
  size = "md",
  className,
}: ConnectionAvatarProps) {
  const initials = getPersonInitials(person);
  const fullName = getPersonFullName(person);

  if (person.profilePhotoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={person.profilePhotoUrl}
        alt={fullName}
        className={cn(
          "rounded-xl border border-roicard-border object-cover",
          sizeClasses[size],
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-xl border border-roicard-border bg-roicard-bg-muted font-semibold text-roicard-text",
        sizeClasses[size],
        className
      )}
      aria-hidden
    >
      {initials}
    </div>
  );
}
