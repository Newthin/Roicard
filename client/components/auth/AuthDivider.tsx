export function AuthDivider() {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-roicard-border" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-roicard-bg-elevated px-3 text-xs uppercase tracking-wider text-roicard-text-muted">
          or continue with email
        </span>
      </div>
    </div>
  );
}
