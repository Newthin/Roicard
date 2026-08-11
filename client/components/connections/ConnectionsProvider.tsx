/**
 * ConnectionsProvider
 *
 * Shared connection state for dashboard pages.
 * Wraps mock localStorage operations with React state and refresh helpers.
 */

"use client";

import {
  acceptRequest as acceptRequestStorage,
  declineRequest as declineRequestStorage,
  getConnectionSummary,
  getConnections,
  getIncomingRequests,
  getSentRequests,
} from "@/lib/connections/storage";
import type {
  Connection,
  ConnectionSummary,
  IncomingConnectionRequest,
} from "@/lib/connections/types";
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type ConnectionsContextValue = {
  requests: IncomingConnectionRequest[];
  sentRequests: IncomingConnectionRequest[];
  connections: Connection[];
  summary: ConnectionSummary;
  isLoading: boolean;
  refresh: () => void;
  acceptRequest: (requestId: string) => void;
  declineRequest: (requestId: string) => void;
};

const ConnectionsContext = createContext<ConnectionsContextValue | null>(null);

export function useConnections() {
  const context = useContext(ConnectionsContext);
  if (!context) {
    throw new Error("useConnections must be used within ConnectionsProvider");
  }
  return context;
}

type ConnectionsProviderProps = {
  children: ReactNode;
};

export function ConnectionsProvider({ children }: ConnectionsProviderProps) {
  const [requests, setRequests] = useState<IncomingConnectionRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<IncomingConnectionRequest[]>(
    []
  );
  const [connections, setConnections] = useState<Connection[]>([]);
  const [summary, setSummary] = useState<ConnectionSummary>({
    pendingCount: 0,
    totalConnections: 0,
    recentConnections: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  /** Reloads all connection data from the backend. */
  const refresh = useCallback(async () => {
    const [requests, sentRequests, connections, summary] = await Promise.all([
      getIncomingRequests(),
      getSentRequests(),
      getConnections(),
      getConnectionSummary(),
    ]);
    setRequests(requests);
    setSentRequests(sentRequests);
    setConnections(connections);
    setSummary(summary);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /** State transition: pending request → accepted connection. */
  const acceptRequest = useCallback(
    async (requestId: string) => {
      await acceptRequestStorage(requestId);
      refresh();
    },
    [refresh]
  );

  /** Removes a declined request from the queue. */
  const declineRequest = useCallback(
    async (requestId: string) => {
      await declineRequestStorage(requestId);
      refresh();
    },
    [refresh]
  );

  const value = useMemo(
    () => ({
      requests,
      sentRequests,
      connections,
      summary,
      isLoading,
      refresh,
      acceptRequest,
      declineRequest,
    }),
    [
      requests,
      sentRequests,
      connections,
      summary,
      isLoading,
      refresh,
      acceptRequest,
      declineRequest,
    ]
  );

  return (
    <ConnectionsContext.Provider value={value}>
      {children}
    </ConnectionsContext.Provider>
  );
}
