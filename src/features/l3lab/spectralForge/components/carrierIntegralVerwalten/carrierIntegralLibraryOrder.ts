import type { LibraryDragOperation, LibrarySortMode } from "./carrierIntegralLibraryDrag";

export type CarrierIntegralLibraryOrderEntry = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
};

export function sortCarrierIntegralLibraryEntries<T extends CarrierIntegralLibraryOrderEntry>(
  entries: T[],
  sortMode: LibrarySortMode,
  manualOrder: string[],
): T[] {
  const next = [...entries];
  switch (sortMode) {
    case "manual": {
      const order = new Map(manualOrder.map((id, index) => [id, index]));
      next.sort((a, b) => {
        const ai = order.get(a.id);
        const bi = order.get(b.id);
        if (ai !== undefined && bi !== undefined) return ai - bi;
        if (ai !== undefined) return -1;
        if (bi !== undefined) return 1;
        return b.updatedAt - a.updatedAt;
      });
      break;
    }
    case "name-asc":
      next.sort((a, b) =>
        a.name.localeCompare(b.name, "de", { sensitivity: "base" }),
      );
      break;
    case "created-desc":
      next.sort((a, b) => b.createdAt - a.createdAt);
      break;
    case "updated-desc":
    default:
      next.sort((a, b) => b.updatedAt - a.updatedAt);
      break;
  }
  return next;
}

export function createCarrierIntegralManualLibraryOrder(entries: CarrierIntegralLibraryOrderEntry[]): string[] {
  return entries.map((entry) => entry.id);
}

export function resolveCarrierIntegralLibraryDropOrder(args: {
  entries: CarrierIntegralLibraryOrderEntry[];
  manualOrder: string[];
  dragId: string;
  targetId: string;
  operation: LibraryDragOperation;
}): string[] | null {
  const { entries, manualOrder, dragId, targetId, operation } = args;
  if (!dragId || dragId === targetId) return null;

  const entryIds = new Set(entries.map((entry) => entry.id));
  const ids = (manualOrder.length ? manualOrder : entries.map((entry) => entry.id))
    .filter((id) => entryIds.has(id));
  if (!ids.includes(dragId)) ids.push(dragId);
  if (!ids.includes(targetId)) ids.push(targetId);

  const withoutDrag = ids.filter((id) => id !== dragId);
  const targetIndex = withoutDrag.indexOf(targetId);
  if (targetIndex < 0) return null;

  if (operation === "swap") {
    const dragIndex = ids.indexOf(dragId);
    const targetOriginalIndex = ids.indexOf(targetId);
    if (dragIndex < 0 || targetOriginalIndex < 0) return null;
    const next = [...ids];
    next[dragIndex] = targetId;
    next[targetOriginalIndex] = dragId;
    return next;
  }

  const insertAt = operation === "insert-after" ? targetIndex + 1 : targetIndex;
  const next = [...withoutDrag];
  next.splice(insertAt, 0, dragId);
  return next;
}
