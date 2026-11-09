export type PlaylistDropOperation = 'swap' | 'insert-before' | 'insert-after';

export type PlaylistDropPreviewEntry = {
  id: string;
  title: string;
};

export type PlaylistDropPreview = {
  operation: PlaylistDropOperation;
  label: 'TAUSCHEN' | 'REINSCHIEBEN';
  targetLine: string;
  highlightedEntryIds: string[];
};

export type PlaylistDropTarget = {
  operation: PlaylistDropOperation;
  entryId: string;
};

export type PlaylistDropHitRow = {
  id: string;
  top: number;
  bottom: number;
};

const DEFAULT_INSERT_BAND_RATIO = 0.32;

let transparentPlaylistDragImage: HTMLCanvasElement | null = null;

export function encodePlaylistDropTarget(operation: PlaylistDropOperation, entryId: string) {
  return `${operation}:${entryId}`;
}

export function decodePlaylistDropTarget(value: string): PlaylistDropTarget | null {
  const separatorIndex = value.indexOf(':');
  if (separatorIndex <= 0) return null;
  const operation = value.slice(0, separatorIndex);
  const entryId = value.slice(separatorIndex + 1);
  if ((operation === 'swap' || operation === 'insert-before' || operation === 'insert-after') && entryId) {
    return { operation, entryId };
  }
  return null;
}

function formatInsertTargetLine(beforeEntry: PlaylistDropPreviewEntry | null, afterEntry: PlaylistDropPreviewEntry | null) {
  return beforeEntry && afterEntry
    ? `${beforeEntry.title} 🔽 ${afterEntry.title}`
    : afterEntry
      ? `🔽 ${afterEntry.title}`
      : beforeEntry
        ? `${beforeEntry.title} 🔽`
        : '🔽';
}

export function resolvePlaylistDropPreview(
  value: string,
  entries: readonly PlaylistDropPreviewEntry[],
  draggedEntryId?: string,
): PlaylistDropPreview | null {
  const decoded = decodePlaylistDropTarget(value);
  if (!decoded) return null;

  if (decoded.operation === 'swap') {
    if (draggedEntryId && decoded.entryId === draggedEntryId) return null;
    const targetEntry = entries.find((entry) => entry.id === decoded.entryId);
    if (!targetEntry) return null;
    return {
      operation: 'swap',
      label: 'TAUSCHEN',
      targetLine: `🔄 ${targetEntry.title}`,
      highlightedEntryIds: [targetEntry.id],
    };
  }

  const filteredEntries = draggedEntryId ? entries.filter((entry) => entry.id !== draggedEntryId) : [...entries];
  const targetIndex = filteredEntries.findIndex((entry) => entry.id === decoded.entryId);
  if (targetIndex < 0) return null;

  const beforeEntry = decoded.operation === 'insert-before'
    ? filteredEntries[targetIndex - 1] ?? null
    : filteredEntries[targetIndex] ?? null;
  const afterEntry = decoded.operation === 'insert-before'
    ? filteredEntries[targetIndex] ?? null
    : filteredEntries[targetIndex + 1] ?? null;
  const highlightedEntryIds = [beforeEntry?.id, afterEntry?.id].filter((id): id is string => !!id);

  return {
    operation: decoded.operation,
    label: 'REINSCHIEBEN',
    targetLine: formatInsertTargetLine(beforeEntry, afterEntry),
    highlightedEntryIds,
  };
}

export function resolvePhaseShiftedPlaylistDropTarget(args: {
  pointerY: number;
  rows: readonly PlaylistDropHitRow[];
  insertBandRatio?: number;
}): PlaylistDropTarget | null {
  const rows = [...args.rows]
    .filter((row) => row.id && Number.isFinite(row.top) && Number.isFinite(row.bottom) && row.bottom > row.top)
    .sort((a, b) => a.top - b.top);
  if (!rows.length) return null;

  const first = rows[0];
  const last = rows[rows.length - 1];
  if (args.pointerY < first.top) return { operation: 'insert-before', entryId: first.id };
  if (args.pointerY > last.bottom) return { operation: 'insert-after', entryId: last.id };

  const row = rows.find((candidate) => args.pointerY >= candidate.top && args.pointerY <= candidate.bottom)
    ?? rows.reduce((nearest, candidate) => {
      const nearestCenter = (nearest.top + nearest.bottom) / 2;
      const candidateCenter = (candidate.top + candidate.bottom) / 2;
      return Math.abs(candidateCenter - args.pointerY) < Math.abs(nearestCenter - args.pointerY) ? candidate : nearest;
    }, rows[0]);

  const height = Math.max(1, row.bottom - row.top);
  const local = (args.pointerY - row.top) / height;
  const insertBandRatio = Math.max(0.2, Math.min(0.45, args.insertBandRatio ?? DEFAULT_INSERT_BAND_RATIO));

  if (local <= insertBandRatio) return { operation: 'insert-before', entryId: row.id };
  if (local >= 1 - insertBandRatio) return { operation: 'insert-after', entryId: row.id };
  return { operation: 'swap', entryId: row.id };
}

export function reorderPlaylistIds(args: {
  ids: readonly string[];
  draggedId: string;
  targetId: string;
  operation: PlaylistDropOperation;
}): string[] {
  const ids = args.ids.filter((id, index, all) => id && all.indexOf(id) === index);
  const currentIndex = ids.indexOf(args.draggedId);
  const targetIndex = ids.indexOf(args.targetId);
  if (currentIndex < 0 || targetIndex < 0 || args.draggedId === args.targetId) return ids;

  if (args.operation === 'swap') {
    const next = [...ids];
    next[currentIndex] = args.targetId;
    next[targetIndex] = args.draggedId;
    return next;
  }

  const withoutDragged = ids.filter((id) => id !== args.draggedId);
  const normalizedTargetIndex = withoutDragged.indexOf(args.targetId);
  if (normalizedTargetIndex < 0) return ids;
  const insertIndex = args.operation === 'insert-before' ? normalizedTargetIndex : normalizedTargetIndex + 1;
  const next = [...withoutDragged];
  next.splice(Math.max(0, Math.min(next.length, insertIndex)), 0, args.draggedId);
  return next;
}

export function playlistOrderEquals(a: readonly string[], b: readonly string[]) {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

export function suppressNativePlaylistDragImage(dataTransfer: DataTransfer | null | undefined) {
  if (!dataTransfer || typeof document === 'undefined') return;
  if (!transparentPlaylistDragImage) {
    transparentPlaylistDragImage = document.createElement('canvas');
    transparentPlaylistDragImage.width = 1;
    transparentPlaylistDragImage.height = 1;
  }
  dataTransfer.setDragImage(transparentPlaylistDragImage, 0, 0);
}
