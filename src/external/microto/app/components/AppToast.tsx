import { useEffect } from "react";

export type AppToastProps = {
  message: string;
  kind?: "info" | "success" | "error";
  onDismiss: () => void;
  timeoutMs?: number;
};

export function AppToast({ message, kind = "info", onDismiss, timeoutMs = 2400 }: AppToastProps) {
  useEffect(() => {
    const id = window.setTimeout(() => onDismiss(), timeoutMs);
    return () => window.clearTimeout(id);
  }, [onDismiss, timeoutMs]);

  const tone =
    kind === "success"
      ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
      : kind === "error"
        ? "border-red-400/40 bg-red-500/10 text-red-100"
        : "border-sky-400/40 bg-sky-500/10 text-sky-100";

  return (
    <div className="fixed right-4 bottom-4 z-50">
      <div className={`max-w-sm rounded border px-3 py-2 text-xs shadow-lg backdrop-blur ${tone}`}>
        <div className="flex items-start gap-2">
          <div className="flex-1">{message}</div>
          <button
            type="button"
            onClick={onDismiss}
            className="text-[10px] uppercase tracking-widest opacity-80 hover:opacity-100"
            title="Dismiss"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}

