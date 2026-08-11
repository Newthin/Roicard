"use client";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { X } from "lucide-react";
import { ReactNode, useEffect } from "react";

export type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close modal overlay"
        className="absolute inset-0 bg-[var(--rc-overlay)] backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        className={cn(
          "relative z-10 w-full max-w-lg overflow-y-auto rounded-xl border border-roicard-border bg-roicard-bg-elevated p-6 shadow-2xl theme-transition",
          "max-h-[calc(100dvh-3.5rem)] sm:max-h-[calc(100dvh-4rem)]",
          className
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="space-y-1">
            {title && (
              <h2 id="modal-title" className="text-lg font-semibold text-roicard-text">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-sm text-roicard-text-muted">{description}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 shrink-0 p-0"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {children && <div className="text-sm text-roicard-text-muted">{children}</div>}

        {footer && <div className="mt-6 flex justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
}
