import type { DragEvent } from "react";

export type LibrarySortMode = "updated-desc" | "created-desc" | "name-asc" | "manual";
export type LibraryDragOperation = "swap" | "insert-before" | "insert-after";

export type LibraryDragState = {
  dragId: string;
  overId: string | null;
  operation: LibraryDragOperation | null;
};

export function dragOperationLabel(operation: LibraryDragOperation | null): string {
  if (operation === "swap") return "Tauschen";
  if (operation === "insert-before" || operation === "insert-after") return "Reinschieben";
  return "";
}

export function resolveLibraryDragOperation(event: DragEvent<HTMLElement>): LibraryDragOperation {
  const rect = event.currentTarget.getBoundingClientRect();
  const y = event.clientY - rect.top;
  if (y < rect.height * 0.28) return "insert-before";
  if (y > rect.height * 0.72) return "insert-after";
  return "swap";
}
