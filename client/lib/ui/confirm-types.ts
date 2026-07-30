/**
 * Confirmation dialog types.
 *
 * Shared options for the global confirm() API.
 */

export type ConfirmVariant = "primary" | "danger";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
};

export type ConfirmContextValue = {
  /** Opens a confirmation dialog and resolves true/false when the user decides. */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};
