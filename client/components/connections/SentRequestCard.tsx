/**
 * SentRequestCard
 *
 * Read-only display of a connection request the current user has sent and is
 * still waiting to have answered. Shows who it went to (with a link to their
 * real public profile when it exists) and the submitted intro/intent so the
 * sender can recall the context.
 */

"use client";

import { ConnectionAvatar } from "@/components/connections/ConnectionAvatar";
import { formatConnectionDate, getPersonFullName } from "@/lib/connections/helpers";
import type { IncomingConnectionRequest } from "@/lib/connections/types";
import { Clock, Handshake } from "lucide-react";
import Link from "next/link";

type SentRequestCardProps = {
  request: IncomingConnectionRequest;
};

export function SentRequestCard({ request }: SentRequestCardProps) {
  const { person } = request;
  const fullName = getPersonFullName(person);

  const name = person.username ? (
    <Link
      href={`/${person.username}`}
      className="truncate font-semibold text-roicard-text underline-offset-4 hover:text-roicard-accent hover:underline"
    >
      {fullName}
    </Link>
  ) : (
    <span className="truncate font-semibold text-roicard-text">{fullName}</span>
  );

  return (
    <article className="glass-card rounded-2xl p-4 sm:p-5">
      <div className="flex items-start gap-4">
        <ConnectionAvatar person={person} size="lg" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate">{name}</h3>
          <p className="mt-0.5 truncate text-sm text-roicard-text-muted">
            {person.professionalTitle || person.organization || "ROICARD member"}
          </p>

          <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-roicard-accent">
            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Sent {formatConnectionDate(request.requestedAt)} — awaiting response
          </p>

          {(request.introduction || request.intent) && (
            <div className="mt-3 space-y-2 border-t border-roicard-border pt-3">
              {request.introduction && (
                <p className="text-sm leading-relaxed text-roicard-text-muted">
                  <span className="font-medium text-roicard-text">You introduced yourself: </span>
                  {request.introduction}
                </p>
              )}
              {request.intent && (
                <p className="text-sm leading-relaxed text-roicard-text-muted">
                  <span className="font-medium text-roicard-text">Your reason for connecting: </span>
                  {request.intent}
                </p>
              )}
            </div>
          )}

          <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-roicard-text-muted">
            <Handshake className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {fullName} will be notified when they respond.
          </p>
        </div>
      </div>
    </article>
  );
}