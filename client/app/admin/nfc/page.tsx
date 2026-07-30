/**
 * Admin NFC Management Page
 *
 * Route: /admin/nfc
 * NFC card assignment system with modal-based workflows.
 */

import { NFCManagementView } from "@/components/admin";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NFC Management — Admin",
};

export default function AdminNfcPage() {
  return <NFCManagementView />;
}
