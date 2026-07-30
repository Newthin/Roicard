import { PublicProfileClient } from "./PublicProfileClient";

export function generateStaticParams() {
  return [{ username: "_" }];
}

export default function PublicProfilePage() {
  return <PublicProfileClient />;
}
