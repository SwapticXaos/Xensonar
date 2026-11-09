import type { ReactNode } from "react";

type RoomQuickStartCardProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Shared visual treatment for inline "Quick start" / room guidance blocks.
 * Keeps quick-start copy consistent across rooms while leaving content domain-specific.
 */
export function RoomQuickStartCard({ children, className }: RoomQuickStartCardProps) {
  return (
    <div
      className={`text-xs text-neutral-400 border border-neutral-800 bg-black/40 rounded px-3 py-2 ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

