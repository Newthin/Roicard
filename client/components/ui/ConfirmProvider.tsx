/**
 * ConfirmProvider
 *
 * Global confirmation dialog system.
 * Call confirm() before destructive or significant actions.
 *
 * @example
 * const confirmed = await confirm({
 *   title: "Remove assignment?",
 *   description: "This NFC card will be unassigned.",
 *   confirmLabel: "Remove",
 *   variant: "danger",
 * });
 * if (confirmed) doAction();
 */

"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type {
  ConfirmContextValue,
  ConfirmOptions,
  ConfirmVariant,
} from "@/lib/ui/confirm-types";
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

type ConfirmState = ConfirmOptions & {
  isOpen: boolean;
};

const defaultState: ConfirmState = {
  isOpen: false,
  title: "",
  description: "",
  confirmLabel: "Confirm",
  cancelLabel: "Cancel",
  variant: "primary",
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within ConfirmProvider");
  }
  return ctx;
}

type ConfirmProviderProps = {
  children: ReactNode;
};

export function ConfirmProvider({ children }: ConfirmProviderProps) {
  const [state, setState] = useState<ConfirmState>(defaultState);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  /** Closes dialog and resolves the pending promise. */
  const finish = useCallback((result: boolean) => {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setState(defaultState);
  }, []);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setState({
        isOpen: true,
        title: options.title,
        description: options.description ?? "",
        confirmLabel: options.confirmLabel ?? "Confirm",
        cancelLabel: options.cancelLabel ?? "Cancel",
        variant: options.variant ?? "primary",
      });
    });
  }, []);

  const value = useMemo(() => ({ confirm }), [confirm]);

  const confirmVariant: ConfirmVariant = state.variant ?? "primary";

  return (
    <ConfirmContext.Provider value={value}>
      {children}

      <Modal
        isOpen={state.isOpen}
        onClose={() => finish(false)}
        title={state.title}
        className="max-w-md"
        footer={
          <div className="flex w-full gap-3">
            <Button
              variant="secondary"
              fullWidth
              className="rounded-xl"
              onClick={() => finish(false)}
            >
              {state.cancelLabel}
            </Button>
            <Button
              variant={confirmVariant === "danger" ? "danger" : "primary"}
              fullWidth
              className="rounded-xl"
              onClick={() => finish(true)}
            >
              {state.confirmLabel}
            </Button>
          </div>
        }
      >
        {state.description ? (
          <p className="text-sm leading-relaxed text-roicard-text-muted">
            {state.description}
          </p>
        ) : null}
      </Modal>
    </ConfirmContext.Provider>
  );
}
