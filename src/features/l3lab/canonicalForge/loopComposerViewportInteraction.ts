import {
  type LoopComposerState,
} from './loopDrumDomain';
import {
  applyLoopComposerVerticalViewportWindow,
  applyLoopComposerViewportWindow,
  getLoopComposerVerticalViewportWindow,
  getLoopComposerViewportWindow,
} from './viewportMath';

export type ComposerViewportDragMode = 'move' | 'resize-start' | 'resize-end';

export type ComposerViewportDragState = {
  mode: ComposerViewportDragMode;
  pointerStartX: number;
  startUnit: number;
  endUnit: number;
  visibleUnits: number;
  totalUnits: number;
  rectLeft: number;
  rectWidth: number;
};

export type ComposerVerticalViewportDragState = {
  mode: ComposerViewportDragMode;
  pointerStartY: number;
  startLine: number;
  endLine: number;
  visibleLines: number;
  totalLines: number;
  rectTop: number;
  rectHeight: number;
};

export function createComposerViewportDragState(
  wrap: HTMLDivElement | null,
  state: LoopComposerState,
  mode: ComposerViewportDragMode,
  pointerStartX: number,
): ComposerViewportDragState | null {
  if (!wrap) return null;
  const rect = wrap.getBoundingClientRect();
  const viewport = getLoopComposerViewportWindow(state);
  return {
    mode,
    pointerStartX,
    startUnit: viewport.scrollStart,
    endUnit: viewport.scrollEnd,
    visibleUnits: viewport.visibleSteps,
    totalUnits: viewport.totalSteps,
    rectLeft: rect.left,
    rectWidth: Math.max(1, rect.width),
  };
}

export function createComposerViewportJumpState(
  wrap: HTMLDivElement | null,
  state: LoopComposerState,
  pointerClientX: number,
): ComposerViewportDragState | null {
  if (!wrap) return null;
  const rect = wrap.getBoundingClientRect();
  const viewport = getLoopComposerViewportWindow(state);
  const ratio = Math.max(0, Math.min(1, (pointerClientX - rect.left) / Math.max(1, rect.width)));
  const maxStart = Math.max(0, viewport.totalSteps - viewport.visibleSteps);
  const clampedStart = Math.max(0, Math.min(maxStart, ratio * viewport.totalSteps - viewport.visibleSteps * 0.5));
  return {
    mode: 'move',
    pointerStartX: pointerClientX,
    startUnit: clampedStart,
    endUnit: clampedStart + viewport.visibleSteps,
    visibleUnits: viewport.visibleSteps,
    totalUnits: viewport.totalSteps,
    rectLeft: rect.left,
    rectWidth: Math.max(1, rect.width),
  };
}

export function applyComposerViewportDrag(draft: LoopComposerState, drag: ComposerViewportDragState, clientX: number) {
  const deltaRatio = (clientX - drag.pointerStartX) / Math.max(1, drag.rectWidth);
  const deltaUnits = deltaRatio * drag.totalUnits;
  if (drag.mode === 'move') {
    applyLoopComposerViewportWindow(draft, drag.startUnit + deltaUnits, drag.visibleUnits);
    return;
  }
  if (drag.mode === 'resize-start') {
    const nextStart = Math.max(0, Math.min(drag.endUnit - 8, drag.startUnit + deltaUnits));
    applyLoopComposerViewportWindow(draft, nextStart, drag.endUnit - nextStart);
    return;
  }
  const nextEnd = Math.max(drag.startUnit + 8, Math.min(drag.totalUnits, drag.endUnit + deltaUnits));
  applyLoopComposerViewportWindow(draft, drag.startUnit, nextEnd - drag.startUnit);
}

export function createComposerVerticalViewportDragState(
  wrap: HTMLDivElement | null,
  state: LoopComposerState,
  mode: ComposerViewportDragMode,
  pointerStartY: number,
): ComposerVerticalViewportDragState | null {
  if (!wrap) return null;
  const rect = wrap.getBoundingClientRect();
  const viewport = getLoopComposerVerticalViewportWindow(state);
  return {
    mode,
    pointerStartY,
    startLine: viewport.scrollStart,
    endLine: viewport.scrollEnd,
    visibleLines: viewport.visibleLines,
    totalLines: viewport.totalLines,
    rectTop: rect.top,
    rectHeight: Math.max(1, rect.height),
  };
}

export function createComposerVerticalViewportJumpState(
  wrap: HTMLDivElement | null,
  state: LoopComposerState,
  pointerClientY: number,
): ComposerVerticalViewportDragState | null {
  if (!wrap) return null;
  const rect = wrap.getBoundingClientRect();
  const viewport = getLoopComposerVerticalViewportWindow(state);
  const ratio = Math.max(0, Math.min(1, (pointerClientY - rect.top) / Math.max(1, rect.height)));
  const targetStart = ratio * viewport.totalLines - viewport.visibleLines * 0.5;
  const clampedStart = Math.max(0, Math.min(Math.max(0, viewport.totalLines - viewport.visibleLines), targetStart));
  return {
    mode: 'move',
    pointerStartY: pointerClientY,
    startLine: clampedStart,
    endLine: clampedStart + viewport.visibleLines,
    visibleLines: viewport.visibleLines,
    totalLines: viewport.totalLines,
    rectTop: rect.top,
    rectHeight: Math.max(1, rect.height),
  };
}

export function applyComposerVerticalViewportDrag(draft: LoopComposerState, drag: ComposerVerticalViewportDragState, clientY: number) {
  const deltaRatioY = (clientY - drag.pointerStartY) / Math.max(1, drag.rectHeight);
  const deltaLines = deltaRatioY * drag.totalLines;
  if (drag.mode === 'move') {
    applyLoopComposerVerticalViewportWindow(draft, drag.startLine - deltaLines, drag.visibleLines);
    return;
  }
  if (drag.mode === 'resize-start') {
    const nextEnd = Math.max(drag.startLine + 8, Math.min(drag.totalLines, drag.endLine - deltaLines));
    applyLoopComposerVerticalViewportWindow(draft, drag.startLine, nextEnd - drag.startLine);
    return;
  }
  const nextStart = Math.max(0, Math.min(drag.endLine - 8, drag.startLine - deltaLines));
  applyLoopComposerVerticalViewportWindow(draft, nextStart, drag.endLine - nextStart);
}
