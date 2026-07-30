import { ConnectionRequestsView } from "@/components/connections/ConnectionRequestsView";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connection Requests",
};

export default function ConnectionRequestsPage() {
  return <ConnectionRequestsView />;
}
