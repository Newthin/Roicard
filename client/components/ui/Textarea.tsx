import { cn } from "@/lib/cn";
import { TextareaHTMLAttributes, forwardRef } from "react";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
  hint?: string;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, rows = 3, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="w-full space-y-2">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-roicard-text"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          className={cn(
            "flex w-full rounded-lg border border-roicard-border bg-roicard-bg-muted px-4 py-3 text-sm text-roicard-text theme-transition",
            "placeholder:text-roicard-text-muted",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-roicard-accent/50 focus-visible:border-roicard-accent/50",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-red-500 focus-visible:ring-red-500/50",
            className
          )}
          {...props}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        {!error && hint && (
          <p className="text-sm text-roicard-text-muted">{hint}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
