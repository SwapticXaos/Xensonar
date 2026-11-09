import type { DragEvent as ReactDragEvent } from 'react';
import { encodePlaylistDropTarget, suppressNativePlaylistDragImage, type PlaylistDropOperation } from './playlistDropOperation';

export function handleMaterialLoopDragStart(args: {
  event: ReactDragEvent<HTMLElement>;
  entryId: string;
  setDragId: (value: string) => void;
  setDropId: (value: string) => void;
}) {
  args.event.dataTransfer.effectAllowed = 'move';
  args.event.dataTransfer.setData('text/plain', args.entryId);
  suppressNativePlaylistDragImage(args.event.dataTransfer);
  args.setDragId(args.entryId);
  args.setDropId(args.entryId);
}

export function handleMaterialLoopDragOver(args: {
  event: ReactDragEvent<HTMLElement>;
  entryId: string;
  operation: PlaylistDropOperation;
  dropId: string;
  setDropId: (value: string) => void;
}) {
  args.event.preventDefault();
  const target = encodePlaylistDropTarget(args.operation, args.entryId);
  if (args.dropId !== target) args.setDropId(target);
}

export async function handleMaterialLoopDrop(args: {
  event: ReactDragEvent<HTMLElement>;
  targetId: string;
  operation: PlaylistDropOperation;
  dragId: string;
  sessionDraggedId?: string;
  setDragId: (value: string) => void;
  setDropId: (value: string) => void;
  visibleOrderIds?: readonly string[];
  onMoveToIndex: (entryId: string, targetIndex: number, operation: PlaylistDropOperation, visibleOrderIds?: readonly string[]) => Promise<unknown>;
}) {
  args.event.preventDefault();
  const draggedId = args.sessionDraggedId || args.event.dataTransfer.getData('text/plain') || args.dragId;
  args.setDragId('');
  args.setDropId('');
  if (!draggedId || draggedId === args.targetId) return false;
  if (!args.visibleOrderIds?.length) return false;
  const visibleIds = args.visibleOrderIds.filter((id, index, all) => id && all.indexOf(id) === index);
  if (!visibleIds.includes(draggedId)) return false;
  const targetIndex = visibleIds.findIndex((id) => id === args.targetId);
  if (targetIndex < 0) return false;
  await args.onMoveToIndex(draggedId, targetIndex, args.operation, visibleIds);
  return true;
}

export function handleMaterialLoopDragEnd(args: {
  setDragId: (value: string) => void;
  setDropId: (value: string) => void;
}) {
  args.setDragId('');
  args.setDropId('');
}
