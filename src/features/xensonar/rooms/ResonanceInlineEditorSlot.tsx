import type { ReactNode } from "react";

type ResonanceInlineEditorSlotProps = {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
};

export function ResonanceInlineEditorSlot({
  title,
  open,
  onToggle,
  children,
}: ResonanceInlineEditorSlotProps) {
  return (
    <div className="rounded border border-violet-800/70 bg-violet-950/20 p-2">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between rounded border border-violet-700 bg-violet-900/40 px-3 py-2 text-left text-sm text-violet-100 transition hover:bg-violet-900/60"
      >
        <span>{title}</span>
        <span className="text-xs text-violet-300">{open ? "−" : "+"}</span>
      </button>
      {open ? <div className="mt-2">{children}</div> : null}
    </div>
  );
}
