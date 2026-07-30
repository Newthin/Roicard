"use client";

import { PublicProfileView } from "@/components/profile/PublicProfileView";
import { useParams } from "next/navigation";

export function PublicProfileClient() {
  const { username } = useParams<{ username: string }>();
  return <PublicProfileView username={username} />;
}
