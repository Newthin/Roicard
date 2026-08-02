"use client";

export type SocialProvider = "google" | "facebook" | "linkedin" | "x";
export type SocialAuthMode = "signin" | "signup";

type SocialAuthButtonProps = {
  provider: SocialProvider;
  label: string;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function ProviderIcon({ provider }: { provider: SocialProvider }) {
  switch (provider) {
    case "google":
      return (
        <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden xmlns="http://www.w3.org/2000/svg">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
      );
    case "facebook":
      return (
        <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden xmlns="http://www.w3.org/2000/svg">
          <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.026 1.792-4.697 4.533-4.697 1.313 0 2.686.235 2.686.235v2.97H15.83c-1.491 0-1.956.93-1.956 1.886v2.266h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" fill="#1877F2" />
        </svg>
      );
    case "linkedin":
      return (
        <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden xmlns="http://www.w3.org/2000/svg">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" fill="#0A66C2" />
        </svg>
      );
    case "x":
      return (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden xmlns="http://www.w3.org/2000/svg">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
  }
}

/** Horizontal row of compact social icons. Hover shows the action label. */
export function SocialAuthButton({
  provider,
  label,
}: SocialAuthButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => {
        window.location.href = `${API_BASE}/auth/social/${provider}/redirect`;
      }}
      className="group relative flex h-12 flex-1 items-center justify-center rounded-xl border border-roicard-border bg-roicard-bg-muted/40 text-roicard-text transition-colors hover:border-roicard-accent/60 hover:bg-roicard-bg-elevated focus:outline-none focus-visible:ring-2 focus-visible:ring-roicard-accent"
    >
      <ProviderIcon provider={provider} />
      <span
        role="tooltip"
        className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-roicard-text px-2.5 py-1 text-xs font-medium text-roicard-bg opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100"
      >
        {label}
      </span>
    </button>
  );
}

/** Horizontal row of icon-only social login buttons. */
export function SocialAuthRow({ mode }: { mode: SocialAuthMode }) {
  const prefix = mode === "signin" ? "Continue with" : "Sign up with";
  const providers: SocialProvider[] = [
    "google",
    "facebook",
    "linkedin",
    "x",
  ];

  return (
    <div className="flex items-center gap-3">
      {providers.map((p) => (
        <SocialAuthButton key={p} provider={p} label={`${prefix} ${label(p)}`} />
      ))}
    </div>
  );

  function label(p: SocialProvider) {
    const names: Record<SocialProvider, string> = {
      google: "Google",
      facebook: "Facebook",
      linkedin: "LinkedIn",
      x: "X",
    };
    return names[p];
  }
}