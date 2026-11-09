import type { MaterialEntry } from '../../l3lab/materialLibrary';

export function resolveManagedLoopEntry(entries: MaterialEntry[], entryId: string) {
  if (!entryId) return null;
  const entry = entries.find((candidate) => candidate.id === entryId) ?? null;
  if (!entry) return null;
  const index = entries.findIndex((candidate) => candidate.id === entry.id);
  return index >= 0 ? { entry, index } : null;
}

export function resolveManagedLoopBrowseEntry(args: {
  entries: MaterialEntry[];
  managedIndex: number;
  activeId: string;
  direction: -1 | 1;
}) {
  const { entries, managedIndex, activeId, direction } = args;
  if (entries.length === 0) return null;
  const currentIndex = managedIndex >= 0
    ? managedIndex
    : entries.findIndex((entry) => entry.id === activeId);
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;
  const nextIndex = Math.min(entries.length - 1, Math.max(0, safeIndex + direction));
  const entry = entries[nextIndex];
  return entry ? { entry, index: nextIndex } : null;
}
