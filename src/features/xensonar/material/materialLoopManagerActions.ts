import { deleteMaterialEntry, getMaterialLibraryState, reorderMaterialEntriesByIdOrder, updateMaterialEntry, type MaterialEntry } from '../../l3lab/materialLibrary';
import { playlistOrderEquals, reorderPlaylistIds, type PlaylistDropOperation } from './playlistDropOperation';
import { isVisibleMaterialLoopBankEntry } from './materialLoopRoleFilters';
import { resolveManagedLoopBrowseEntry, resolveManagedLoopEntry } from './materialLoopManagerState';
import { resolveMaterialLoopDeleteFallback, resolveMaterialLoopManagerTargetId } from './materialLoopBrowserUtils';
import {
  formatManagedMaterialLoopStatus,
  formatMaterialLoopDeletedStatus,
  formatMaterialLoopPlaylistShiftStatus,
  formatMaterialLoopRenamedStatus,
} from './materialLoopStatusText';

export type MaterialLoopManagerSetters = {
  setManageId: (value: string) => void;
  setRenameDraft: (value: string) => void;
  setDragId: (value: string) => void;
  setDropId: (value: string) => void;
  setStatus: (value: string) => void;
};

export function closeMaterialLoopManager(setters: Pick<MaterialLoopManagerSetters, 'setManageId' | 'setRenameDraft' | 'setDragId' | 'setDropId'>) {
  setters.setManageId('');
  setters.setRenameDraft('');
  setters.setDragId('');
  setters.setDropId('');
}

export function openMaterialLoopManager(args: {
  entries: MaterialEntry[];
  requestedId?: string;
  activeId: string;
  setters: Pick<MaterialLoopManagerSetters, 'setManageId' | 'setRenameDraft'>;
}) {
  const targetId = resolveMaterialLoopManagerTargetId({ entries: args.entries, requestedId: args.requestedId, activeId: args.activeId });
  const resolved = resolveManagedLoopEntry(args.entries, targetId ?? '');
  if (!resolved) return false;
  args.setters.setManageId(resolved.entry.id);
  args.setters.setRenameDraft(resolved.entry.name);
  return true;
}

export function activateManagedMaterialLoop(args: {
  entries: MaterialEntry[];
  entryId: string;
  setters: Pick<MaterialLoopManagerSetters, 'setManageId' | 'setRenameDraft' | 'setStatus'>;
  onSelect: (entryId: string) => void;
}) {
  const resolved = resolveManagedLoopEntry(args.entries, args.entryId);
  if (!resolved) return false;
  args.setters.setManageId(resolved.entry.id);
  args.setters.setRenameDraft(resolved.entry.name);
  args.onSelect(resolved.entry.id);
  args.setters.setStatus(formatManagedMaterialLoopStatus(resolved.entry.name, resolved.index, args.entries.length));
  return true;
}

export async function saveMaterialLoopRename(args: {
  managedLoopMaterial: MaterialEntry | null;
  renameDraft: string;
  setters: Pick<MaterialLoopManagerSetters, 'setRenameDraft' | 'setStatus'>;
}) {
  if (!args.managedLoopMaterial) return null;
  const nextName = args.renameDraft.trim() || args.managedLoopMaterial.name;
  const updated = await updateMaterialEntry(args.managedLoopMaterial.id, { name: nextName });
  args.setters.setRenameDraft(updated.name);
  args.setters.setStatus(formatMaterialLoopRenamedStatus(updated.name));
  return updated;
}

export function browseManagedMaterialLoop(args: {
  entries: MaterialEntry[];
  managedIndex: number;
  activeId: string;
  direction: -1 | 1;
  setters: Pick<MaterialLoopManagerSetters, 'setManageId' | 'setRenameDraft' | 'setStatus'>;
  onSelect: (entryId: string) => void;
}) {
  const resolved = resolveManagedLoopBrowseEntry({ entries: args.entries, managedIndex: args.managedIndex, activeId: args.activeId, direction: args.direction });
  if (!resolved) return false;
  args.setters.setManageId(resolved.entry.id);
  args.setters.setRenameDraft(resolved.entry.name);
  args.onSelect(resolved.entry.id);
  args.setters.setStatus(formatManagedMaterialLoopStatus(resolved.entry.name, resolved.index, args.entries.length));
  return true;
}

export async function shiftMaterialLoopOrder(args: {
  managedLoopMaterial: MaterialEntry | null;
  setters: Pick<MaterialLoopManagerSetters, 'setManageId' | 'setRenameDraft' | 'setStatus'>;
  onSelect: (entryId: string) => void;
  direction: -1 | 1;
}) {
  if (!args.managedLoopMaterial) return null;
  const loops = getMaterialLibraryState().entries.filter(isVisibleMaterialLoopBankEntry);
  const currentOrder = loops.map((entry) => entry.id);
  const currentIndex = currentOrder.indexOf(args.managedLoopMaterial.id);
  if (currentIndex < 0) return null;
  const targetIndex = currentIndex + args.direction;
  if (targetIndex < 0 || targetIndex >= currentOrder.length) return args.managedLoopMaterial;
  const targetEntryId = currentOrder[targetIndex] ?? '';
  if (!targetEntryId) return null;
  const nextOrder = reorderPlaylistIds({
    ids: currentOrder,
    draggedId: args.managedLoopMaterial.id,
    targetId: targetEntryId,
    operation: 'swap',
  });
  if (playlistOrderEquals(currentOrder, nextOrder)) return args.managedLoopMaterial;
  await reorderMaterialEntriesByIdOrder(nextOrder);
  const nextLoops = getMaterialLibraryState().entries.filter(isVisibleMaterialLoopBankEntry);
  const moved = nextLoops.find((entry) => entry.id === args.managedLoopMaterial?.id) ?? args.managedLoopMaterial;
  args.setters.setManageId(moved.id);
  args.setters.setRenameDraft(moved.name);
  args.onSelect(moved.id);
  const ordinal = nextLoops.findIndex((entry) => entry.id === moved.id) + 1;
  args.setters.setStatus(formatMaterialLoopPlaylistShiftStatus(moved.name, ordinal, nextLoops.length));
  return moved;
}

export async function moveMaterialLoopToIndex(args: {
  entryId: string;
  targetIndex: number;
  operation: PlaylistDropOperation;
  visibleOrderIds?: readonly string[];
  clampIndex: (value: number, min: number, max: number) => number;
  setters: Pick<MaterialLoopManagerSetters, 'setManageId' | 'setRenameDraft' | 'setStatus'>;
  onSelect: (entryId: string) => void;
}) {
  const loops = getMaterialLibraryState().entries.filter(isVisibleMaterialLoopBankEntry);
  const liveOrder = loops.map((entry) => entry.id);
  const visibleOrder = args.visibleOrderIds && args.visibleOrderIds.length
    ? args.visibleOrderIds.filter((id, index, all) => id && all.indexOf(id) === index && liveOrder.includes(id))
    : liveOrder;
  const currentOrder = visibleOrder.length ? visibleOrder : liveOrder;
  const currentIndex = currentOrder.indexOf(args.entryId);
  if (currentIndex < 0) return null;
  const boundedTargetIndex = args.clampIndex(args.targetIndex, 0, currentOrder.length - 1);
  const targetEntryId = currentOrder[boundedTargetIndex] ?? '';
  if (!targetEntryId) return null;

  const nextOrder = reorderPlaylistIds({
    ids: currentOrder,
    draggedId: args.entryId,
    targetId: targetEntryId,
    operation: args.operation,
  });
  if (playlistOrderEquals(currentOrder, nextOrder)) return null;

  await reorderMaterialEntriesByIdOrder(nextOrder);
  const nextLoops = getMaterialLibraryState().entries.filter(isVisibleMaterialLoopBankEntry);
  const movedEntry = nextLoops.find((entry) => entry.id === args.entryId);
  if (!movedEntry) return null;
  args.setters.setManageId(movedEntry.id);
  args.setters.setRenameDraft(movedEntry.name);
  args.onSelect(movedEntry.id);
  const ordinal = nextLoops.findIndex((entry) => entry.id === movedEntry.id) + 1;
  args.setters.setStatus(formatMaterialLoopPlaylistShiftStatus(movedEntry.name, ordinal, nextLoops.length));
  return movedEntry;
}

export async function deleteMaterialLoopDirect(args: {
  entries: MaterialEntry[];
  entryId: string;
  setters: MaterialLoopManagerSetters;
  onSelect: (entryId: string) => void;
}) {
  const entry = args.entries.find((candidate) => candidate.id === args.entryId);
  if (!entry) return null;
  const currentIndex = args.entries.findIndex((candidate) => candidate.id === args.entryId);
  await deleteMaterialEntry(args.entryId);
  const nextLoops = getMaterialLibraryState().entries.filter(isVisibleMaterialLoopBankEntry);
  const fallback = resolveMaterialLoopDeleteFallback(nextLoops, currentIndex);
  if (fallback) {
    args.setters.setManageId(fallback.id);
    args.setters.setRenameDraft(fallback.name);
    args.onSelect(fallback.id);
  } else {
    closeMaterialLoopManager(args.setters);
  }
  args.setters.setStatus(formatMaterialLoopDeletedStatus(entry.name));
  return entry;
}
