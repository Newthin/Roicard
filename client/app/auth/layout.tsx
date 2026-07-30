import { ReactNode } from "react";

export default function AuthRouteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-roicard-bg">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(230,57,70,0.12),_transparent_55%)]" />
      <div className="pointer-events-none absolute -right-32 top-1/3 h-64 w-64 rounded-full bg-roicard-accent/5 blur-3xl" />
      <div className="pointer-events-none absolute -left-32 bottom-1/4 h-64 w-64 rounded-full bg-roicard-primary/5 blur-3xl" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
