import { useCallback, useRef, type DragEvent as ReactDragEvent } from 'react';
import {
  resolvePhaseShiftedPlaylistDropTarget,
  type PlaylistDropHitRow,
  type PlaylistDropTarget,
} from '../material/playlistDropOperation';

export type PhaseShiftedPlaylistDragSession<Payload = undefined> = {
  draggedId: string;
  originVisibleIds: string[];
  previewTarget: PlaylistDropTarget | null;
  payload: Payload;
};

type BeginDragArgs<Payload> = {
  draggedId: string;
  originVisibleIds: readonly string[];
  payload: Payload;
};

type UsePhaseShiftedPlaylistDragSessionOptions<Payload> = {
  isSelfSwapTarget?: (target: PlaylistDropTarget, session: PhaseShiftedPlaylistDragSession<Payload>) => boolean;
};

export function usePhaseShiftedPlaylistDragSession<Payload = undefined>(
  options: UsePhaseShiftedPlaylistDragSessionOptions<Payload> = {},
) {
  const rowRefs = useRef(new Map<string, HTMLElement>());
  const sessionRef = useRef<PhaseShiftedPlaylistDragSession<Payload> | null>(null);

  const registerRow = useCallback((id: string, element: HTMLElement | null) => {
    if (element) rowRefs.current.set(id, element);
    else rowRefs.current.delete(id);
  }, []);

  const beginDrag = useCallback((args: BeginDragArgs<Payload>) => {
    sessionRef.current = {
      draggedId: args.draggedId,
      originVisibleIds: args.originVisibleIds.filter((id, index, all) => id && all.indexOf(id) === index),
      previewTarget: null,
      payload: args.payload,
    };
  }, []);

  const clearDrag = useCallback(() => {
    sessionRef.current = null;
  }, []);

  const getSession = useCallback(() => sessionRef.current, []);

  const normalizeTarget = useCallback((target: PlaylistDropTarget | null) => {
    const session = sessionRef.current;
    if (!target || !session) return null;
    if (!session.originVisibleIds.includes(target.entryId)) return null;
    const isSelfSwapTarget = options.isSelfSwapTarget
      ? options.isSelfSwapTarget(target, session)
      : target.operation === 'swap' && target.entryId === session.draggedId;
    if (isSelfSwapTarget) return null;
    return target;
  }, [options]);

  const resolveTargetFromDragEvent = useCallback((event: ReactDragEvent<HTMLElement>) => {
    const session = sessionRef.current;
    const sourceIds = session?.originVisibleIds ?? Array.from(rowRefs.current.keys());
    const rows = sourceIds
      .map((id): PlaylistDropHitRow | null => {
        const element = rowRefs.current.get(id);
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return { id, top: rect.top, bottom: rect.bottom };
      })
      .filter((row): row is PlaylistDropHitRow => Boolean(row));
    return normalizeTarget(resolvePhaseShiftedPlaylistDropTarget({ pointerY: event.clientY, rows }));
  }, [normalizeTarget]);

  const updatePreviewFromDragEvent = useCallback((event: ReactDragEvent<HTMLElement>) => {
    const session = sessionRef.current;
    if (!session) return null;
    const target = resolveTargetFromDragEvent(event);
    if (target) session.previewTarget = target;
    return target;
  }, [resolveTargetFromDragEvent]);

  const getDropTarget = useCallback(() => {
    const session = sessionRef.current;
    return normalizeTarget(session?.previewTarget ?? null);
  }, [normalizeTarget]);

  return {
    beginDrag,
    clearDrag,
    getDropTarget,
    getSession,
    registerRow,
    updatePreviewFromDragEvent,
  };
}
