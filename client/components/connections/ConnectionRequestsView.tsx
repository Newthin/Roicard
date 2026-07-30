/**
 * ConnectionRequestsView
 *
 * Incoming connection requests with accept/decline actions.
 * Route: /dashboard/connections/requests
 */

"use client";

import { ConnectionRequestCard } from "@/components/connections/ConnectionRequestCard";
import { useConnections } from "@/components/connections/ConnectionsProvider";
import { ConnectionsEmptyState } from "@/components/connections/ConnectionsEmptyState";
import { ConnectionsLoadingState } from "@/components/connections/ConnectionsLoadingState";
import { ConnectionsSubNav } from "@/components/connections/ConnectionsSubNav";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { getPersonFullName, sortRequests } from "@/lib/connections/helpers";
import { useMemo, useState } from "react";

export function ConnectionRequestsView() {
  const { requests, isLoading, acceptRequest, declineRequest } =
    useConnections();
  const { confirm } = useConfirm();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const sortedRequests = useMemo(() => sortRequests(requests), [requests]);

  /** Accept flow — confirm then mock delay and state transition. */
  const handleAccept = async (requestId: string) => {
    const request = requests.find((r) => r.id === requestId);
    if (!request) return;

    const confirmed = await confirm({
      title: "Accept connection?",
      description: `Add ${getPersonFullName(request.person)} to your connections.`,
      confirmLabel: "Accept",
    });

    if (!confirmed) return;

    setProcessingId(requestId);
    setTimeout(() => {
      acceptRequest(requestId);
      setProcessingId(null);
    }, 400);
  };

  /** Decline flow — confirm then remove request from queue. */
  const handleDecline = async (requestId: string) => {
    const request = requests.find((r) => r.id === requestId);
    if (!request) return;

    const confirmed = await confirm({
      title: "Decline connection request?",
      description: `This will remove the request from ${getPersonFullName(request.person)}.`,
      confirmLabel: "Decline",
      variant: "danger",
    });

    if (!confirmed) return;

    setProcessingId(requestId);
    setTimeout(() => {
      declineRequest(requestId);
      setProcessingId(null);
    }, 300);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-roicard-text">Connection Requests</h1>
          <p className="mt-1 text-sm text-roicard-text-muted">
            Review and respond to incoming requests
          </p>
        </div>
        {requests.length > 0 && (
          <span className="inline-flex items-center rounded-full bg-roicard-primary/15 px-3 py-1 text-sm font-medium text-roicard-accent">
            {requests.length} pending
          </span>
        )}
      </div>

      <ConnectionsSubNav />

      {isLoading ? (
        <ConnectionsLoadingState />
      ) : sortedRequests.length === 0 ? (
        <ConnectionsEmptyState
          title="No pending requests"
          description="When someone sends you a connection request, it will appear here for you to accept or decline."
          actionLabel="View connections"
          actionHref="/dashboard/connections"
        />
      ) : (
        <div className="space-y-4">
          {sortedRequests.map((request) => (
            <ConnectionRequestCard
              key={request.id}
              request={request}
              onAccept={handleAccept}
              onDecline={handleDecline}
              isProcessing={processingId === request.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
