import {
  LOOP_COMPOSER_GUTTER_W,
  LOOP_COMPOSER_HEADER_H,
  buildLoopLineLayout,
  composerChannelCount,
  getLoopNoteLineRect,
  getLoopNoteScreenRect,
  getLoopTimeGuides,
  isLoopEditableFragmentCutMarker,
  loopUnitsPerBeat,
  notesAtGridCell,
  totalComposerSteps,
  type LoopComposerState,
  type LoopNoteEvent,
} from './loopDrumDomain';

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

export type LoopComposerCanvasGeometry = {
  canvas: HTMLCanvasElement;
  totalSteps: number;
  visibleSteps: number;
  scrollStart: number;
  gutterW: number;
  headerH: number;
  cellW: number;
  lineLayout: ReturnType<typeof buildLoopLineLayout>;
};

export type LoopComposerHit = {
  x: number;
  y: number;
  channelIndex: number;
  rawUnit: number;
  gridUnit: number;
  inHeader: boolean;
  inGrid: boolean;
  inGutter: boolean;
  inLineGrab: boolean;
  lineY: number;
  headerGuide: ReturnType<typeof getLoopTimeGuides>[number] | null;
  note: LoopNoteEvent | null;
  noteRect: ReturnType<typeof getLoopNoteScreenRect> | null;
  cellNotes: LoopNoteEvent[];
  geometry: LoopComposerCanvasGeometry;
};

export function clampLoopComposerUnit(state: Pick<LoopComposerState, 'stepsPerBar' | 'bars'>, rawUnit: number) {
  const totalUnits = totalComposerSteps(state as LoopComposerState);
  return Math.max(0, Math.min(totalUnits, rawUnit));
}

export function snapLoopComposerMarkerUnit(
  state: Pick<LoopComposerState, 'timeGuideMarkers' | 'stepsPerBar' | 'beatsPerBar' | 'bars'>,
  rawUnit: number,
  cellW: number,
) {
  const totalUnits = totalComposerSteps(state as LoopComposerState);
  const unitsPerBeat = loopUnitsPerBeat(state as Pick<LoopComposerState, 'stepsPerBar' | 'beatsPerBar'>);
  const guides = getLoopTimeGuides({ ...(state as Pick<LoopComposerState, 'timeGuideMarkers' | 'bars' | 'beatsPerBar'>), segmentCount: state.timeGuideMarkers.length || state.beatsPerBar });
  const markers = guides.filter((marker) => !marker.muted).map((marker) => ({ unit: marker.beat * unitsPerBeat, kind: marker.kind }));
  let bestUnit = rawUnit;
  let bestDistance = Infinity;
  for (const marker of markers) {
    const threshold = marker.kind === 'bar' ? 14 / Math.max(1, cellW) : 10 / Math.max(1, cellW);
    const distance = Math.abs(rawUnit - marker.unit);
    if (distance <= threshold && distance < bestDistance) {
      bestUnit = marker.unit;
      bestDistance = distance;
    }
  }
  return Math.max(0, Math.min(totalUnits, bestUnit));
}

export function snapLoopComposerUnit(state: LoopComposerState, rawUnit: number, cellW: number) {
  return clampLoopComposerUnit(state, snapLoopComposerMarkerUnit(state, rawUnit, cellW));
}

export function getLoopComposerCanvasGeometry(canvas: HTMLCanvasElement, state: LoopComposerState): LoopComposerCanvasGeometry {
  const totalSteps = totalComposerSteps(state);
  const visibleSteps = Math.max(8, Math.min(totalSteps, Math.round(totalSteps / Math.max(1, state.zoom))));
  const maxScroll = Math.max(0, totalSteps - visibleSteps);
  const scrollStart = Math.round(clamp01(state.scrollX) * maxScroll);
  const gutterW = LOOP_COMPOSER_GUTTER_W;
  const headerH = LOOP_COMPOSER_HEADER_H;
  const cellW = (canvas.width - gutterW) / Math.max(1, visibleSteps);
  const lineLayout = buildLoopLineLayout(state, canvas.height, headerH);
  return { canvas, totalSteps, visibleSteps, scrollStart, gutterW, headerH, cellW, lineLayout };
}

export function hitLoopComposerCanvas(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
  state: LoopComposerState,
  options: { lockTrackEditing?: boolean; materialFragmentPrepActive?: boolean } = {},
): LoopComposerHit | null {
  const geometry = getLoopComposerCanvasGeometry(canvas, state);
  if (!geometry) return null;
  const lockTrackEditing = !!options.lockTrackEditing;
  const materialFragmentPrepActive = !!options.materialFragmentPrepActive;
  const rect = geometry.canvas.getBoundingClientRect();
  // Keep drag math continuous even when the pointer leaves the visual bounds.
  // In the stable reference behavior, visual exit only changes hover feedback;
  // the gesture itself ends on explicit mouseup/release.
  const x = ((clientX - rect.left) / Math.max(1, rect.width)) * geometry.canvas.width;
  const y = ((clientY - rect.top) / Math.max(1, rect.height)) * geometry.canvas.height;
  const channelIndex = Math.max(0, Math.min(composerChannelCount(state) - 1, geometry.lineLayout.nearestLineIndex(y)));
  const rawUnit = geometry.scrollStart + (x - geometry.gutterW) / Math.max(1, geometry.cellW);
  const gridUnit = snapLoopComposerUnit(state, rawUnit, geometry.cellW);
  const inHeader = y < geometry.headerH;
  const inGrid = x >= geometry.gutterW && y >= geometry.headerH;
  const inGutter = x < geometry.gutterW && y >= geometry.headerH;
  const lineRect = getLoopNoteLineRect(geometry.lineLayout, channelIndex);
  const lineY = lineRect.lineY;
  const inLineGrab = inGutter && Math.abs(y - lineY) <= Math.max(12, lineRect.noteH);
  const unitsPerBeat = loopUnitsPerBeat(state);
  const editableHeaderGuides = getLoopTimeGuides(state).filter((marker) => marker.kind === 'guide' || (materialFragmentPrepActive && isLoopEditableFragmentCutMarker(state, marker)));
  const headerGuide = inHeader
    ? (editableHeaderGuides.find((marker) => {
        const unit = marker.beat * unitsPerBeat;
        const gx = geometry.gutterW + (unit - geometry.scrollStart) * geometry.cellW;
        return Math.abs(x - gx) <= 12 && y >= geometry.headerH - 14 && y <= geometry.headerH;
      }) ?? null)
    : null;
  const rawCellNotes = inGrid ? notesAtGridCell(state, channelIndex, gridUnit, state.selectedTrackId, state.selectedNoteId) : [];
  const filteredCellNotes = lockTrackEditing ? rawCellNotes.filter((entry) => entry.trackId === state.selectedTrackId) : rawCellNotes;
  const cellNotes = lockTrackEditing ? filteredCellNotes : rawCellNotes;
  let note: LoopNoteEvent | null = null;
  let noteRect: ReturnType<typeof getLoopNoteScreenRect> | null = null;
  if (inGrid) {
    const visualHitNotes = state.notes
      .filter((entry) => state.activeTrackIds.includes(entry.trackId))
      .filter((entry) => !lockTrackEditing || entry.trackId === state.selectedTrackId)
      .filter((candidate) => {
        const rect = getLoopNoteScreenRect(state, candidate, geometry.lineLayout, {
          gutterW: geometry.gutterW,
          cellW: geometry.cellW,
          scrollStart: geometry.scrollStart,
          visibleSteps: geometry.visibleSteps,
        });
        const hitNote = x >= rect.x - 6 && x <= rect.x + rect.w + 6 && y >= rect.y - rect.hitPadY && y <= rect.y + rect.noteH + rect.hitPadY;
        if (hitNote && !noteRect) noteRect = rect;
        return hitNote;
      });
    note = visualHitNotes.find((entry) => entry.id === state.selectedNoteId) ?? visualHitNotes[0] ?? cellNotes[0] ?? null;
    if (note && !noteRect) {
      noteRect = getLoopNoteScreenRect(state, note, geometry.lineLayout, {
        gutterW: geometry.gutterW,
        cellW: geometry.cellW,
        scrollStart: geometry.scrollStart,
        visibleSteps: geometry.visibleSteps,
      });
    }
  }
  return { x, y, channelIndex, rawUnit, gridUnit, inHeader, inGrid, inGutter, inLineGrab, lineY, headerGuide, note, noteRect, cellNotes, geometry };
}
