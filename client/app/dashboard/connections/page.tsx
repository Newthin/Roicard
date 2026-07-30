import { MyConnectionsView } from "@/components/connections/MyConnectionsView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Connections",
};

export default function ConnectionsPage() {
  return <MyConnectionsView />;
}
