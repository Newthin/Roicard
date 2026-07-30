/**
 * ConnectionRequestCard
 *
 * Displays an incoming connection request with accept/decline actions.
 *
 * Props:
 * - request: IncomingConnectionRequest from storage
 * - onAccept: accept handler — transitions to Connected
 * - onDecline: decline handler — removes request
 * - isProcessing: disables buttons during mock API delay
 */

"use client";

import { ConnectionAvatar } from "@/components/connections/ConnectionAvatar";
import { Button } from "@/components/ui/Button";
import {
  formatConnectionDate,
  getPersonFullName,
} from "@/lib/connections/helpers";
import type { IncomingConnectionRequest } from "@/lib/connections/types";
import { Check, MapPin, X } from "lucide-react";

type ConnectionRequestCardProps = {
  request: IncomingConnectionRequest;
  onAccept: (requestId: string) => void;
  onDecline: (requestId: string) => void;
  isProcessing?: boolean;
};

export function ConnectionRequestCard({
  request,
  onAccept,
  onDecline,
  isProcessing = false,
}: ConnectionRequestCardProps) {
  const { person } = request;
  const fullName = getPersonFullName(person);

  return (
    <article className="glass-card rounded-2xl p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <ConnectionAvatar person={person} size="lg" />
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-roicard-text">{fullName}</h3>
            <p className="mt-0.5 truncate text-sm text-roicard-text-muted">
              {person.professionalTitle}
            </p>
            {person.organization && (
              <p className="truncate text-sm text-roicard-text-muted/80">
                {person.organization}
              </p>
            )}
            {request.meetingContext && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-roicard-text">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-roicard-accent" aria-hidden />
                <span className="truncate">Met at {request.meetingContext}</span>
              </p>
            )}
            <p className="mt-2 text-xs text-roicard-text-muted">
              Requested {formatConnectionDate(request.requestedAt)}
            </p>
          </div>
        </div>

        <div className="flex gap-2 sm:flex-col sm:gap-2 lg:flex-row">
          <Button
            fullWidth
            className="rounded-xl sm:min-w-[120px]"
            disabled={isProcessing}
            onClick={() => onAccept(request.id)}
          >
            <Check className="h-4 w-4" />
            Accept
          </Button>
          <Button
            variant="secondary"
            fullWidth
            className="rounded-xl sm:min-w-[120px]"
            disabled={isProcessing}
            onClick={() => onDecline(request.id)}
          >
            <X className="h-4 w-4" />
            Decline
          </Button>
        </div>
      </div>
    </article>
  );
}
