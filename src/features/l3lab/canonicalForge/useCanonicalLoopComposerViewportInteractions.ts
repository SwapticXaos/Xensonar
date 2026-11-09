import type * as React from 'react';
import type { MutableRefObject, RefObject } from 'react';
import {
  LOOP_COMPOSER_MAX_VISIBLE_LINES,
  composerChannelCount,
  totalComposerSteps,
  type LoopComposerState,
} from './loopDrumDomain';
import {
  applyLoopComposerVerticalViewportWindow,
  applyLoopComposerViewportWindow,
  getLoopComposerVerticalViewport,
} from './viewportMath';
import {
  applyComposerVerticalViewportDrag,
  applyComposerViewportDrag,
  createComposerVerticalViewportDragState,
  createComposerVerticalViewportJumpState,
  createComposerViewportDragState,
  createComposerViewportJumpState,
  type ComposerVerticalViewportDragState,
  type ComposerViewportDragState,
} from './loopComposerViewportInteraction';
import { getLoopComposerCanvasGeometry } from './loopComposerInteraction';
import type { MutateLoopComposer } from './canonicalMelodicComposerStateController';

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

export function useCanonicalLoopComposerViewportInteractions(args: {
  clipComposerRef: RefObject<HTMLCanvasElement | null>;
  composerOverviewRef: RefObject<HTMLDivElement | null>;
  composerVerticalOverviewRef: RefObject<HTMLDivElement | null>;
  composerViewportDragRef: MutableRefObject<ComposerViewportDragState | null>;
  composerVerticalViewportDragRef: MutableRefObject<ComposerVerticalViewportDragState | null>;
  loopComposer: LoopComposerState;
  mutateLoopComposer: MutateLoopComposer;
}) {
  const handleLoopComposerWheel = (event: any) => {
    event.preventDefault();
    const geometry = args.clipComposerRef.current ? getLoopComposerCanvasGeometry(args.clipComposerRef.current, args.loopComposer) : null;
    const canvas = args.clipComposerRef.current;
    if (!geometry || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / Math.max(1, rect.width)) * canvas.width;
    const y = ((event.clientY - rect.top) / Math.max(1, rect.height)) * canvas.height;
    const focusRatio = Math.max(0, Math.min(1, (x - geometry.gutterW) / Math.max(1, canvas.width - geometry.gutterW)));
    const focusUnit = geometry.scrollStart + Math.max(0, x - geometry.gutterW) / Math.max(1, geometry.cellW);
    const verticalViewport = getLoopComposerVerticalViewport(args.loopComposer);
    const focusLineRatio = Math.max(0, Math.min(1, (y - geometry.lineLayout.bodyTop) / Math.max(1, geometry.lineLayout.bodyBottom - geometry.lineLayout.bodyTop)));
    const focusLine = verticalViewport.scrollStart + focusLineRatio * Math.max(1, verticalViewport.visibleLines - 1);
    args.mutateLoopComposer((draft) => {
      if (event.shiftKey) {
        const zoomFactor = event.deltaY < 0 ? 1.11 : 1 / 1.11;
        const totalLines = Math.max(1, composerChannelCount(draft));
        const nextZoomY = Math.min(12, Math.max(1, (draft.zoomY || 1) * zoomFactor));
        draft.zoomY = nextZoomY;
        const visibleLines = Math.max(LOOP_COMPOSER_MAX_VISIBLE_LINES, Math.min(totalLines, Math.round(totalLines / Math.max(1, nextZoomY))));
        const maxScroll = Math.max(0, totalLines - visibleLines);
        const targetStart = Math.max(0, Math.min(maxScroll, focusLine - visibleLines * focusLineRatio));
        draft.scrollY = maxScroll > 0 ? clamp01(targetStart / maxScroll) : 0;
        return;
      }
      if (Math.abs(event.deltaY) >= Math.abs(event.deltaX || 0)) {
        const zoomFactor = event.deltaY < 0 ? 1.11 : 1 / 1.11;
        const totalUnits = totalComposerSteps(draft);
        const nextZoom = Math.min(12, Math.max(1, draft.zoom * zoomFactor));
        draft.zoom = nextZoom;
        const visibleUnits = Math.max(8, Math.min(totalUnits, totalUnits / Math.max(1, nextZoom)));
        const maxScroll = Math.max(0, totalUnits - visibleUnits);
        const targetStart = Math.max(0, Math.min(maxScroll, focusUnit - visibleUnits * focusRatio));
        draft.scrollX = maxScroll > 0 ? clamp01(targetStart / maxScroll) : 0;
      } else {
        const totalUnits = totalComposerSteps(draft);
        const visibleUnits = Math.max(8, Math.min(totalUnits, totalUnits / Math.max(1, draft.zoom)));
        const maxScroll = Math.max(0, totalUnits - visibleUnits);
        const scrollStart = Math.round(clamp01(draft.scrollX) * maxScroll);
        const targetStart = Math.max(0, Math.min(maxScroll, scrollStart + (event.deltaX / Math.max(18, geometry.cellW))));
        draft.scrollX = maxScroll > 0 ? clamp01(targetStart / maxScroll) : 0;
      }
    }, undefined, { history: false });
  };

  const startComposerViewportDrag = (event: React.MouseEvent<HTMLDivElement>, mode: 'move' | 'resize-start' | 'resize-end') => {
    const dragState = createComposerViewportDragState(args.composerOverviewRef.current, args.loopComposer, mode, event.clientX);
    if (!dragState) return;
    args.composerViewportDragRef.current = dragState;
    event.preventDefault();
    event.stopPropagation();
  };

  const jumpComposerViewportToPointer = (event: React.MouseEvent<HTMLDivElement>) => {
    const dragState = createComposerViewportJumpState(args.composerOverviewRef.current, args.loopComposer, event.clientX);
    if (!dragState) return;
    args.mutateLoopComposer((draft) => {
      applyLoopComposerViewportWindow(draft, dragState.startUnit, dragState.visibleUnits);
    }, undefined, { history: false });
    args.composerViewportDragRef.current = dragState;
    event.preventDefault();
  };

  const startComposerVerticalViewportDrag = (event: React.MouseEvent<HTMLDivElement>, mode: 'move' | 'resize-start' | 'resize-end') => {
    const dragState = createComposerVerticalViewportDragState(args.composerVerticalOverviewRef.current, args.loopComposer, mode, event.clientY);
    if (!dragState) return;
    args.composerVerticalViewportDragRef.current = dragState;
    event.preventDefault();
    event.stopPropagation();
  };

  const jumpComposerVerticalViewportToPointer = (event: React.MouseEvent<HTMLDivElement>) => {
    const dragState = createComposerVerticalViewportJumpState(args.composerVerticalOverviewRef.current, args.loopComposer, event.clientY);
    if (!dragState) return;
    args.mutateLoopComposer((draft) => {
      applyLoopComposerVerticalViewportWindow(draft, dragState.startLine, dragState.visibleLines);
    }, undefined, { history: false });
    args.composerVerticalViewportDragRef.current = dragState;
    event.preventDefault();
  };

  const handleComposerViewportPointerMove = (event: Pick<MouseEvent, 'clientX' | 'clientY'>) => {
    const horizontalViewportDrag = args.composerViewportDragRef.current;
    if (horizontalViewportDrag) {
      args.mutateLoopComposer((draft) => {
        applyComposerViewportDrag(draft, horizontalViewportDrag, event.clientX);
      }, undefined, { history: false });
      return true;
    }
    const verticalViewportDrag = args.composerVerticalViewportDragRef.current;
    if (verticalViewportDrag) {
      args.mutateLoopComposer((draft) => {
        applyComposerVerticalViewportDrag(draft, verticalViewportDrag, event.clientY);
      }, undefined, { history: false });
      return true;
    }
    return false;
  };

  return {
    handleLoopComposerWheel,
    startComposerViewportDrag,
    jumpComposerViewportToPointer,
    startComposerVerticalViewportDrag,
    jumpComposerVerticalViewportToPointer,
    handleComposerViewportPointerMove,
  };
}
