/**
 * Reusable form field for the onboarding wizard.
 *
 * Supports text inputs and textareas with consistent ROICARD styling,
 * labels, hints, and inline error messages.
 */

"use client";

import { cn } from "@/lib/cn";
import { InputHTMLAttributes, TextareaHTMLAttributes, useId } from "react";

type BaseFieldProps = {
  /** Visible label shown above the field */
  label: string;
  /** Validation error message displayed below the field */
  error?: string;
  /** Optional helper text when no error is present */
  hint?: string;
};

/** Props for the input variant of FormField */
export type FormFieldInputProps = BaseFieldProps &
  InputHTMLAttributes<HTMLInputElement> & {
    variant?: "input";
  };

/** Props for the textarea variant of FormField */
export type FormFieldTextareaProps = BaseFieldProps &
  TextareaHTMLAttributes<HTMLTextAreaElement> & {
    variant: "textarea";
  };

export type FormFieldProps = FormFieldInputProps | FormFieldTextareaProps;

export function FormField(props: FormFieldProps) {
  const generatedId = useId();
  const fieldId = props.id ?? generatedId;

  const sharedClassName = cn(
    "w-full rounded-xl border bg-roicard-bg-muted/80 px-4 text-sm text-roicard-text shadow-inner shadow-[var(--rc-shadow)]",
    "border-roicard-border placeholder:text-roicard-text-muted/70",
    "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-roicard-accent/40 focus-visible:border-roicard-accent/50",
    "disabled:cursor-not-allowed disabled:opacity-50",
    props.error &&
      "border-red-500/70 focus-visible:border-red-500/70 focus-visible:ring-red-500/30",
    props.className
  );

  return (
    <div className="w-full space-y-2">
      <label htmlFor={fieldId} className="block text-sm font-medium text-roicard-text">
        {props.label}
      </label>

      {props.variant === "textarea" ? (
        <textarea
          id={fieldId}
          aria-invalid={Boolean(props.error)}
          className={cn(sharedClassName, "min-h-[120px] resize-y py-3")}
          {...(() => {
            const { label, error, hint, variant, ...rest } = props;
            return rest;
          })()}
        />
      ) : (
        <input
          id={fieldId}
          aria-invalid={Boolean(props.error)}
          className={cn(sharedClassName, "h-12")}
          {...(() => {
            const { label, error, hint, variant, ...rest } = props;
            return rest;
          })()}
        />
      )}

      {props.error && (
        <p className="text-sm text-red-400" role="alert">
          {props.error}
        </p>
      )}

      {!props.error && props.hint && (
        <p className="text-sm text-roicard-text-muted">{props.hint}</p>
      )}
    </div>
  );
}
