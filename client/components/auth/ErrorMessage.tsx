import { cn } from "@/lib/cn";
import { AlertCircle } from "lucide-react";

type ErrorMessageProps = {
  message: string;
  title?: string;
  className?: string;
};

export function ErrorMessage({ message, title, className }: ErrorMessageProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3",
        className
      )}
    >
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" aria-hidden />
      <div className="space-y-0.5">
        {title && (
          <p className="text-sm font-medium text-red-300">{title}</p>
        )}
        <p className="text-sm text-red-200/90">{message}</p>
      </div>
    </div>
  );
}
