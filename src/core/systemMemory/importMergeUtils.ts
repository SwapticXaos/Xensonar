export type EnsureUniqueImportedLabelOptions = {
  fallbackLabel?: string;
  importTag?: string;
};

export function ensureUniqueImportedLabel(
  label: string,
  takenLabels: Set<string>,
  options: EnsureUniqueImportedLabelOptions = {},
) {
  const fallbackLabel = options.fallbackLabel ?? 'Importiertes Element';
  const importTag = options.importTag ?? 'Import';
  const base = label.trim() || fallbackLabel;
  if (!takenLabels.has(base)) {
    takenLabels.add(base);
    return base;
  }
  let index = 2;
  while (takenLabels.has(`${base} (${importTag} ${index})`)) index += 1;
  const next = `${base} (${importTag} ${index})`;
  takenLabels.add(next);
  return next;
}

export function buildContentHashLookup<T>(
  items: Iterable<T>,
  getHash: (item: T) => string | null | undefined,
) {
  const lookup = new Map<string, T>();
  for (const item of items) {
    const hash = getHash(item);
    if (!hash) continue;
    lookup.set(hash, item);
  }
  return lookup;
}

export function resolveImportedStableId<T extends string>(args: {
  preferredId: T;
  usedIds: Set<string>;
  createId: () => T;
  isAcceptedId?: (id: string) => boolean;
}) {
  const { preferredId, usedIds, createId, isAcceptedId } = args;
  const acceptable = isAcceptedId ? isAcceptedId(preferredId) : true;
  if (acceptable && !usedIds.has(preferredId)) {
    usedIds.add(preferredId);
    return preferredId;
  }
  const nextId = createId();
  usedIds.add(nextId);
  return nextId;
}
