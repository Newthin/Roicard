"use client";

import { cn } from "@/lib/cn";
import { InputHTMLAttributes, forwardRef, useId } from "react";

export type InputFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
};

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    return (
      <div className="w-full space-y-2">
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-roicard-text"
        >
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
          }
          className={cn(
            "flex h-12 w-full rounded-xl border bg-roicard-bg-muted/80 px-4 text-sm text-roicard-text shadow-inner shadow-[var(--rc-shadow)]",
            "border-roicard-border placeholder:text-roicard-text-muted/70",
            "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-roicard-accent/40 focus-visible:border-roicard-accent/50",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error &&
              "border-red-500/70 focus-visible:border-red-500/70 focus-visible:ring-red-500/30",
            className
          )}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-sm text-red-400">
            {error}
          </p>
        )}
        {!error && hint && (
          <p id={`${inputId}-hint`} className="text-sm text-roicard-text-muted">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

InputField.displayName = "InputField";
