import { ConnectionsProvider } from "@/components/connections/ConnectionsProvider";
import type { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Connections",
};

/**
 * Connections section layout — provides shared connection state
 * to My Connections and Requests sub-routes.
 */
export default function ConnectionsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <ConnectionsProvider>{children}</ConnectionsProvider>;
}
