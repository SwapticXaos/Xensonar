import * as React from 'react';
import { useEffect, type Dispatch, type MutableRefObject, type RefObject, type SetStateAction } from 'react';
import {
  buildChordNotesFromStep,
  clampComposerLength,
  composerTrackById,
  getLoopNoteScreenRect,
  getLoopTimeGuides,
  isLoopEditableFragmentCutMarker,
  loopLineDisplayLabel,
  loopUnitsPerBeat,
  makeLoopNote,
  noteChannelIndex,
  noteDurationUnits,
  noteStartUnit,
  normalizeLoopSelectionBox,
  overlapCountAtCell,
  syncLoopNoteToState,
  totalComposerSteps,
  type LoopComposerState,
  type LoopNoteEvent,
  type LoopNoteSelectionBox,
} from './loopDrumDomain';
import { retimeMaterialLoopBodyForDurationChange } from './materialBaseWorkflow';
import { resolveMaterialGridHz } from './materialBasePitchDisplay';
import { isFragmentableLoopImportBody, isMaterialImportBody, loopImportBodyLabel } from './loopImportExportContracts';
import { MELODIC_IMPORT_PENDING_ANCHOR_HINT, pruneEmptyDynamicImportTracks } from './melodicImportLanePolicy';
import {
  type ComposerVerticalViewportDragState,
  type ComposerViewportDragState,
} from './loopComposerViewportInteraction';
import { useCanonicalLoopComposerViewportInteractions } from './useCanonicalLoopComposerViewportInteractions';
import {
  clampLoopComposerUnit,
  getLoopComposerCanvasGeometry,
  hitLoopComposerCanvas,
  snapLoopComposerMarkerUnit,
} from './loopComposerInteraction';
import { hasSeekableLoopComposerPreview, seekLoopComposerPreviewToStep } from './loopPreview';
import type { MutateLoopComposer } from './canonicalMelodicComposerStateController';

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function zoomComposerAroundStep(state: LoopComposerState, focusUnit: number, factor: number) {
  const totalUnits = totalComposerSteps(state);
  const nextZoom = Math.max(1, Math.min(12, state.zoom * factor));
  const visibleUnits = Math.max(8, Math.min(totalUnits, totalUnits / Math.max(1, nextZoom)));
  const maxScroll = Math.max(0, totalUnits - visibleUnits);
  const targetStart = Math.max(0, Math.min(maxScroll, focusUnit - visibleUnits * 0.5));
  state.zoom = nextZoom;
  state.scrollX = maxScroll > 0 ? clamp01(targetStart / maxScroll) : 0;
}

export type CanonicalComposerDragState = {
  type: 'note-move' | 'note-resize-start' | 'note-resize-end' | 'line-drag' | 'guide-drag' | 'paint' | 'box-select';
  noteId?: string;
  originStep?: number;
  originPitchIndex?: number;
  startStep?: number;
  lengthSteps?: number;
  offsetCents?: number;
  pointerStartX?: number;
  pointerStartY?: number;
  paintTrackId?: string;
  lastPaintSignature?: string;
  boxAnchorStep?: number;
  boxAnchorStepIndex?: number;
  guideGroupIndex?: number;
  guideId?: string;
  guideRepeatPerBar?: boolean;
  guideStartBeat?: number;
  grabOffsetUnits?: number;
  anchorEndUnit?: number;
  anchorStartUnit?: number;
  pitchAnchorOnly?: boolean;
  pitchAnchorTrackId?: string;
  pitchAnchorOffsets?: Record<string, number>;
};

export function useCanonicalLoopComposerInteractions(args: {
  clipComposerRef: RefObject<HTMLCanvasElement | null>;
  composerOverviewRef: RefObject<HTMLDivElement | null>;
  composerVerticalOverviewRef: RefObject<HTMLDivElement | null>;
  composerDragRef: MutableRefObject<CanonicalComposerDragState | null>;
  composerViewportDragRef: MutableRefObject<ComposerViewportDragState | null>;
  composerVerticalViewportDragRef: MutableRefObject<ComposerVerticalViewportDragState | null>;
  loopComposer: LoopComposerState;
  lockTrackEditing: boolean;
  materialFragmentPrepActive: boolean;
  autoZoomOnDenseOverlap: boolean;
  selectedLoopNoteIds: string[];
  chordVoicing: string;
  chordStrumSteps: number;
  chordVelocitySlope: number;
  mutateLoopComposer: MutateLoopComposer;
  refreshSelectionFromBox: (box: LoopNoteSelectionBox, keepExisting?: boolean) => void;
  previewComposerGesture: (gesture: { trackId: string; channelIndex: number; note?: LoopNoteEvent | null; statusLabel?: string }) => Promise<void> | void;
  setSelectedLoopNoteIds: Dispatch<SetStateAction<string[]>>;
  setComposerSelectionBox: Dispatch<SetStateAction<LoopNoteSelectionBox | null>>;
  setComposerHover: Dispatch<SetStateAction<{ stepIndex: number | null; gridStep: number | null }>>;
  setComposerCursor: Dispatch<SetStateAction<'grab' | 'grabbing' | 'ew-resize' | 'crosshair'>>;
  setShowChordGhost: Dispatch<SetStateAction<boolean>>;
  setDenseOverlapWarning: Dispatch<SetStateAction<{ stepId: string; gridStep: number; count: number } | null>>;
  setStatus: (status: string) => void;
}) {
  const finalizeComposerDraggedNote = (dragState: CanonicalComposerDragState) => {
    if (!dragState.noteId) return;
    const geometry = args.clipComposerRef.current ? getLoopComposerCanvasGeometry(args.clipComposerRef.current, args.loopComposer) : null;
    const cellW = geometry?.cellW ?? 24;
    args.mutateLoopComposer((draft) => {
      const note = draft.notes.find((entry) => entry.id === dragState.noteId);
      if (!note) return;
      const totalUnits = totalComposerSteps(draft);
      if (dragState.type === 'note-move') {
        if (dragState.pitchAnchorOnly && dragState.pitchAnchorTrackId) {
          draft.notes.forEach((entry) => {
            if (entry.trackId !== dragState.pitchAnchorTrackId || !entry.pendingPitchAnchor) return;
            if (isMaterialImportBody(entry)) {
              entry.anchorHz = resolveMaterialGridHz(draft, entry);
            }
            entry.pendingPitchAnchor = false;
            syncLoopNoteToState(draft, entry);
          });
        } else {
          const duration = noteDurationUnits(draft, note);
          const snappedStart = snapLoopComposerMarkerUnit(draft, note.startUnit, cellW);
          const maxStart = Math.max(0, totalUnits - duration);
          note.startUnit = Math.max(0, Math.min(maxStart, snappedStart));
        }
      } else if (dragState.type === 'note-resize-start') {
        const endUnit = note.startUnit + noteDurationUnits(draft, note);
        const snappedStart = snapLoopComposerMarkerUnit(draft, note.startUnit, cellW);
        note.startUnit = Math.max(0, Math.min(endUnit - 0.125, snappedStart));
        note.durationUnits = clampComposerLength(endUnit - note.startUnit);
      } else if (dragState.type === 'note-resize-end') {
        const startUnit = note.startUnit;
        const rawEnd = startUnit + noteDurationUnits(draft, note);
        const snappedEnd = snapLoopComposerMarkerUnit(draft, rawEnd, cellW);
        note.durationUnits = clampComposerLength(Math.max(0.125, Math.min(totalUnits - startUnit, snappedEnd - startUnit)));
      }
      syncLoopNoteToState(draft, note);
    });
    if (dragState.type === 'note-move' && dragState.pitchAnchorOnly) {
      const sourceNote = args.loopComposer.notes.find((entry) => entry.id === dragState.noteId) ?? null;
      args.setStatus(isMaterialImportBody(sourceNote)
        ? 'Raw-Audio-Anker gesetzt. Diese Griffstufe spielt das Roh-Audio unverändert; normales Dragging bleibt aktiv.'
        : 'Import-Anker gesetzt. Normales Dragging bleibt aktiv.');
    }
  };

  const paintComposerNoteAt = (channelIndex: number, startUnit: number, trackId: string) => {
    let noteId = '';
    args.mutateLoopComposer((draft) => {
      const track = composerTrackById(draft, trackId);
      if (!track || !track.enabled) return;
      const existing = draft.notes.find((entry) => entry.trackId === trackId && noteChannelIndex(draft, entry) === channelIndex && Math.abs(noteStartUnit(draft, entry) - startUnit) < 0.001);
      if (existing) {
        noteId = existing.id;
        draft.selectedTrackId = trackId;
        draft.selectedNoteId = existing.id;
        return;
      }
      const note = makeLoopNote(draft, {
        trackId,
        channelIndex,
        startUnit,
        durationUnits: 2,
        velocity: 0.74,
      });
      const synced = syncLoopNoteToState(draft, note);
      draft.notes.push(synced);
      draft.selectedTrackId = trackId;
      draft.selectedNoteId = synced.id;
      noteId = synced.id;
    }, undefined, { history: false });
    if (noteId) {
      args.setComposerSelectionBox(null);
      args.setSelectedLoopNoteIds([noteId]);
    }
  };

  const releaseComposerInteractions = (options?: { keepSelectionBox?: boolean; resetCursor?: boolean }) => {
    const dragState = args.composerDragRef.current;
    if (dragState && (dragState.type === 'note-move' || dragState.type === 'note-resize-start' || dragState.type === 'note-resize-end')) {
      finalizeComposerDraggedNote(dragState);
    }
    args.composerDragRef.current = null;
    args.composerViewportDragRef.current = null;
    args.composerVerticalViewportDragRef.current = null;
    if (!options?.keepSelectionBox) args.setComposerSelectionBox(null);
    if (options?.resetCursor !== false) args.setComposerCursor('grab');
    args.clipComposerRef.current?.removeAttribute('title');
  };

  const handleLoopComposerDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    if (args.composerDragRef.current || args.composerViewportDragRef.current || args.composerVerticalViewportDragRef.current) {
      releaseComposerInteractions();
    }
    args.setShowChordGhost(false);
    const hit = args.clipComposerRef.current ? hitLoopComposerCanvas(args.clipComposerRef.current, event.clientX, event.clientY, args.loopComposer, { lockTrackEditing: args.lockTrackEditing, materialFragmentPrepActive: args.materialFragmentPrepActive }) : null;
    if (!hit) return;
    const canSeekLoopPlayback = event.button === 0
      && !event.altKey
      && !event.shiftKey
      && !event.metaKey
      && !event.ctrlKey
      && hit.inGrid
      && hasSeekableLoopComposerPreview();
    if (canSeekLoopPlayback) {
      seekLoopComposerPreviewToStep(hit.rawUnit);
      if (!hit.note) {
        args.setStatus(`Playhead auf ${hit.rawUnit.toFixed(2)} gesetzt.`);
        return;
      }
    }
    if (hit.inGrid) {
      const overlap = overlapCountAtCell(args.loopComposer, hit.channelIndex, hit.gridUnit);
      args.setDenseOverlapWarning(overlap >= 3 ? { stepId: args.loopComposer.pitchSteps[hit.channelIndex]?.id ?? `step-${hit.channelIndex}`, gridStep: Math.round(hit.gridUnit), count: overlap } : null);
      if (args.autoZoomOnDenseOverlap && overlap >= 3 && args.loopComposer.zoom < 8) {
        args.mutateLoopComposer((draft) => {
          zoomComposerAroundStep(draft, hit.gridUnit, 1.6);
        }, 'Dichte Stelle erkannt: Auto-Zoom aktiviert.');
      }
    }
    if (hit.inHeader && hit.headerGuide) {
      const headerGuide = hit.headerGuide;
      if (event.button === 2 && args.materialFragmentPrepActive && isLoopEditableFragmentCutMarker(args.loopComposer, headerGuide)) {
        args.mutateLoopComposer((draft) => {
          draft.timeGuideMarkers = getLoopTimeGuides(draft).filter((marker) => marker.id !== headerGuide.id);
        }, 'Schnittmarker entfernt.');
        return;
      }
      if (event.altKey) {
        args.mutateLoopComposer((draft) => {
          draft.timeGuideMarkers = getLoopTimeGuides(draft).map((marker) => marker.id === headerGuide.id ? { ...marker, muted: !marker.muted } : { ...marker });
        }, headerGuide.muted ? 'Schnittmarker wieder aktiviert.' : 'Schnittmarker stumm geschaltet.');
        return;
      }
      const match = /guide-(\d+)-(\d+)/.exec(headerGuide.id);
      args.composerDragRef.current = {
        type: 'guide-drag',
        pointerStartX: hit.x,
        guideGroupIndex: match ? Number(match[2]) : 0,
        guideId: headerGuide.id,
        guideRepeatPerBar: headerGuide.repeatPerBar !== false,
        guideStartBeat: headerGuide.beat,
      };
      args.setStatus(headerGuide.repeatPerBar === false
        ? 'Schnittmarker greifen: dieser Marker ist für die Materialbasis frei entkoppelt.'
        : 'Guide-Marker greifen: verschiebe die weichen Segmenthelfer, die Binnenform wiederholt sich pro Takt.');
      return;
    }
    if (args.materialFragmentPrepActive && hit.inGrid && hit.note && args.loopComposer.selectedNoteId && hit.note.id !== args.loopComposer.selectedNoteId) {
      args.setStatus('So schneiden? bleibt auf dem vorbereiteten Importkörper verriegelt. Schließe den Schnitt zuerst ab.');
      return;
    }
    if (event.button === 2) {
      if (hit.note) {
        const note = hit.note;
        args.setSelectedLoopNoteIds((state) => state.filter((id) => id !== note.id));
        args.mutateLoopComposer((draft) => {
          draft.notes = draft.notes.filter((entry) => entry.id !== note.id);
          if (draft.selectedNoteId === note.id) draft.selectedNoteId = null;
          pruneEmptyDynamicImportTracks(draft);
        }, 'Note entfernt.');
      }
      return;
    }
    if (hit.inGutter) {
      if (event.altKey) {
        args.mutateLoopComposer((draft) => {
          const line = draft.pitchLines[hit.channelIndex];
          const step = draft.pitchSteps[hit.channelIndex];
          if (line) line.muted = !line.muted;
          if (step) step.muted = line?.muted ?? !step.muted;
        }, 'Tonlinie stumm/aktiv umgeschaltet.');
      } else if (hit.inLineGrab) {
        const activeLine = args.loopComposer.pitchLines[hit.channelIndex] ?? null;
        args.composerDragRef.current = {
          type: 'line-drag',
          originPitchIndex: hit.channelIndex,
          pointerStartY: hit.y,
          offsetCents: activeLine?.offsetCents ?? 0,
        };
        args.setStatus(`Tonlinie greifen: ${activeLine ? loopLineDisplayLabel(activeLine) : 'Linie'} live verstimmen.`);
      } else {
        args.setStatus('Die linken Dreiecke verankern die Tonlinien. Greife eine Linie direkt an, um sie zu verstimmen.');
      }
      return;
    }
    if (!hit.inGrid) return;
    if ((event.metaKey || event.ctrlKey) && !hit.note) {
      args.composerDragRef.current = {
        type: 'box-select',
        boxAnchorStep: hit.gridUnit,
        boxAnchorStepIndex: hit.channelIndex,
      };
      const nextBox = normalizeLoopSelectionBox({
        anchorUnit: hit.rawUnit,
        headUnit: hit.rawUnit,
        anchorChannelIndex: hit.channelIndex,
        headChannelIndex: hit.channelIndex,
      });
      args.setComposerSelectionBox(nextBox);
      if (!event.shiftKey) args.setSelectedLoopNoteIds([]);
      args.refreshSelectionFromBox(nextBox, event.shiftKey);
      return;
    }
    if (event.altKey && !hit.note) {
      const selectedTrack = composerTrackById(args.loopComposer, args.loopComposer.selectedTrackId);
      if (!selectedTrack || !selectedTrack.enabled) return;
      const signature = `${selectedTrack.id}:${hit.channelIndex}:${hit.rawUnit.toFixed(2)}`;
      args.composerDragRef.current = {
        type: 'paint',
        paintTrackId: selectedTrack.id,
        lastPaintSignature: signature,
      };
      paintComposerNoteAt(hit.channelIndex, snapLoopComposerMarkerUnit(args.loopComposer, hit.rawUnit, hit.geometry.cellW), selectedTrack.id);
      args.setStatus('Paint-Modus: Alt halten und ziehen, um Noten entlang der Tonlinien zu setzen.');
      return;
    }
    if (hit.cellNotes.length > 1 && (event.metaKey || event.ctrlKey)) {
      const currentIdx = hit.cellNotes.findIndex((entry) => entry.id === args.loopComposer.selectedNoteId);
      const next = hit.cellNotes[(currentIdx + 1 + hit.cellNotes.length) % hit.cellNotes.length] ?? hit.cellNotes[0];
      if (next) {
        args.setSelectedLoopNoteIds([next.id]);
        args.mutateLoopComposer((draft) => {
          draft.selectedNoteId = next.id;
          draft.selectedTrackId = next.trackId;
        }, `Stack-Cycle: ${hit.cellNotes.length} überlagerte Noten, Fokus gewechselt.`, { history: false });
      }
      return;
    }
    if (event.shiftKey && !hit.note) {
      const selectedTrack = composerTrackById(args.loopComposer, args.loopComposer.selectedTrackId);
      if (!selectedTrack || !selectedTrack.enabled) return;
      const chordNotes = buildChordNotesFromStep(args.loopComposer, {
        trackId: selectedTrack.id,
        rootChannelIndex: hit.channelIndex,
        startUnit: snapLoopComposerMarkerUnit(args.loopComposer, hit.rawUnit, hit.geometry.cellW),
        durationUnits: 2,
        velocity: 0.74,
        octaveOffset: 0,
        voicing: args.chordVoicing as any,
        strumUnits: args.chordStrumSteps,
        velocitySlope: args.chordVelocitySlope,
      });
      if (chordNotes.length > 0) {
        args.setSelectedLoopNoteIds(chordNotes.map((entry) => entry.id));
        args.mutateLoopComposer((draft) => {
          draft.notes.push(...chordNotes.map((entry) => syncLoopNoteToState(draft, { ...entry })));
          draft.selectedTrackId = selectedTrack.id;
          draft.selectedNoteId = chordNotes[0]?.id ?? null;
        }, `Akkord gesetzt (${args.chordVoicing}, Shift-Klick, Strum ${args.chordStrumSteps}).`);
      }
      return;
    }
    if (hit.note) {
      const note = hit.note;
      const rect = hit.noteRect ?? getLoopNoteScreenRect(args.loopComposer, note, hit.geometry.lineLayout, { gutterW: hit.geometry.gutterW, cellW: hit.geometry.cellW, scrollStart: hit.geometry.scrollStart, visibleSteps: hit.geometry.visibleSteps });
      const edgeThreshold = Math.max(10, rect.handleW + 4);
      const startUnit = noteStartUnit(args.loopComposer, note);
      const durationUnits = noteDurationUnits(args.loopComposer, note);
      const anchorEndUnit = startUnit + durationUnits;
      const pendingPitchAnchor = note.pendingPitchAnchor === true;
      const type = pendingPitchAnchor ? 'note-move' : (hit.x - rect.x < edgeThreshold ? 'note-resize-start' : rect.x + rect.w - hit.x < edgeThreshold ? 'note-resize-end' : 'note-move');
      const originChannel = noteChannelIndex(args.loopComposer, note);
      const pitchAnchorOffsets = pendingPitchAnchor
        ? Object.fromEntries(args.loopComposer.notes.filter((entry) => entry.trackId === note.trackId && entry.pendingPitchAnchor).map((entry) => [entry.id, noteChannelIndex(args.loopComposer, entry) - originChannel]))
        : undefined;
      args.composerDragRef.current = {
        type,
        noteId: note.id,
        startStep: startUnit,
        lengthSteps: durationUnits,
        originStep: hit.rawUnit,
        grabOffsetUnits: hit.rawUnit - startUnit,
        anchorEndUnit,
        anchorStartUnit: startUnit,
        pitchAnchorOnly: pendingPitchAnchor,
        pitchAnchorTrackId: pendingPitchAnchor ? note.trackId : undefined,
        pitchAnchorOffsets,
      };
      args.setComposerCursor(type === 'note-move' ? 'grabbing' : 'ew-resize');
      args.setComposerSelectionBox(null);
      args.setSelectedLoopNoteIds(event.shiftKey ? Array.from(new Set([...args.selectedLoopNoteIds, note.id])) : [note.id]);
      args.mutateLoopComposer((draft) => { draft.selectedNoteId = note.id; draft.selectedTrackId = note.trackId; }, undefined, { history: false });
      if (pendingPitchAnchor) {
        args.setStatus(MELODIC_IMPORT_PENDING_ANCHOR_HINT);
      } else {
        void args.previewComposerGesture({ trackId: note.trackId, channelIndex: note.channelIndex, note, statusLabel: 'Block-Ton vorgehört.' });
      }
      return;
    }
    const selectedTrack = composerTrackById(args.loopComposer, args.loopComposer.selectedTrackId);
    if (!selectedTrack || !selectedTrack.enabled) return;
    const selectedMaterialSource = args.loopComposer.notes.find((entry) => entry.id === args.loopComposer.selectedNoteId);
    const snapUnit = snapLoopComposerMarkerUnit(args.loopComposer, hit.rawUnit, hit.geometry.cellW);
    if (selectedMaterialSource?.pendingPitchAnchor) {
      args.setStatus(MELODIC_IMPORT_PENDING_ANCHOR_HINT);
      return;
    }
    if (selectedMaterialSource && selectedTrack.id === selectedMaterialSource.trackId && isFragmentableLoopImportBody(selectedMaterialSource)) {
      let clonedId = '';
      const bodyLabel = loopImportBodyLabel(selectedMaterialSource);
      args.mutateLoopComposer((draft) => {
        const clone = syncLoopNoteToState(draft, {
          ...selectedMaterialSource,
          id: crypto.randomUUID(),
          startUnit: snapUnit,
          channelIndex: hit.channelIndex,
          lineId: draft.pitchLines[hit.channelIndex]?.id ?? selectedMaterialSource.lineId,
        });
        draft.notes.push(clone);
        draft.notes.sort((a, b) => (noteStartUnit(draft, a) - noteStartUnit(draft, b)) || (noteChannelIndex(draft, a) - noteChannelIndex(draft, b)) || a.trackId.localeCompare(b.trackId));
        draft.selectedTrackId = selectedMaterialSource.trackId;
        draft.selectedNoteId = clone.id;
        clonedId = clone.id;
      }, `${bodyLabel} kopiert.`);
      args.setComposerSelectionBox(null);
      if (clonedId) args.setSelectedLoopNoteIds([clonedId]);
      void args.previewComposerGesture({ trackId: selectedMaterialSource.trackId, channelIndex: hit.channelIndex, note: { ...selectedMaterialSource, channelIndex: hit.channelIndex } as LoopNoteEvent, statusLabel: `${bodyLabel} kopiert und vorgehört.` });
      return;
    }
    const note = makeLoopNote(args.loopComposer, {
      trackId: selectedTrack.id,
      channelIndex: hit.channelIndex,
      startUnit: snapUnit,
      durationUnits: 2,
      velocity: 0.74,
    });
    args.composerDragRef.current = {
      type: 'note-resize-end',
      noteId: note.id,
      startStep: note.startUnit,
      lengthSteps: note.durationUnits,
      originStep: hit.rawUnit,
      anchorStartUnit: note.startUnit,
      anchorEndUnit: note.startUnit + note.durationUnits,
    };
    args.setComposerCursor('ew-resize');
    args.mutateLoopComposer((draft) => {
      draft.notes.push(syncLoopNoteToState(draft, note));
      draft.selectedNoteId = note.id;
    }, 'Neue Note gesetzt.');
    args.setComposerSelectionBox(null);
    args.setSelectedLoopNoteIds([note.id]);
    void args.previewComposerGesture({ trackId: selectedTrack.id, channelIndex: hit.channelIndex, note, statusLabel: 'Rasterschritt vorgehört.' });
  };

  const handleLoopComposerMoveLike = (event: { clientX: number; clientY: number; shiftKey?: boolean }) => {
    const hit = args.clipComposerRef.current ? hitLoopComposerCanvas(args.clipComposerRef.current, event.clientX, event.clientY, args.loopComposer, { lockTrackEditing: args.lockTrackEditing, materialFragmentPrepActive: args.materialFragmentPrepActive }) : null;
    const drag = args.composerDragRef.current;
    if (!hit) {
      args.setComposerHover({ stepIndex: null, gridStep: null });
      args.setShowChordGhost(false);
      args.setDenseOverlapWarning(null);
      return;
    }
    if (!drag) {
      if (hit.note) {
        if (hit.note.pendingPitchAnchor) {
          args.clipComposerRef.current?.setAttribute('title', MELODIC_IMPORT_PENDING_ANCHOR_HINT);
          args.setComposerCursor('grab');
        } else {
          args.clipComposerRef.current?.removeAttribute('title');
          const rect = hit.noteRect ?? getLoopNoteScreenRect(args.loopComposer, hit.note, hit.geometry.lineLayout, { gutterW: hit.geometry.gutterW, cellW: hit.geometry.cellW, scrollStart: hit.geometry.scrollStart, visibleSteps: hit.geometry.visibleSteps });
          const edgeThreshold = Math.max(10, rect.handleW + 4);
          const hoveringEdge = hit.x - rect.x < edgeThreshold || rect.x + rect.w - hit.x < edgeThreshold;
          args.setComposerCursor(hoveringEdge ? 'ew-resize' : 'grab');
        }
      } else {
        args.clipComposerRef.current?.removeAttribute('title');
        args.setComposerCursor(hit.inGrid ? 'grab' : 'crosshair');
      }
    }
    args.setComposerHover({ stepIndex: hit.channelIndex, gridStep: hit.inGrid ? hit.gridUnit : null });
    args.setShowChordGhost(!!event.shiftKey && hit.inGrid && !hit.note && !drag);
    if (hit.inGrid) {
      const overlap = overlapCountAtCell(args.loopComposer, hit.channelIndex, hit.gridUnit);
      args.setDenseOverlapWarning(overlap >= 3 ? { stepId: args.loopComposer.pitchSteps[hit.channelIndex]?.id ?? `step-${hit.channelIndex}`, gridStep: Math.round(hit.gridUnit), count: overlap } : null);
    } else {
      args.setDenseOverlapWarning(null);
    }
    if (!drag) return;
    if (drag.type === 'line-drag') {
      if (drag.originPitchIndex == null || drag.pointerStartY == null) return;
      const originPitchIndex = drag.originPitchIndex;
      const deltaPx = drag.pointerStartY - hit.y;
      const centsDelta = Math.max(-240, Math.min(240, Math.round(deltaPx * 2)));
      let liveLabel = '';
      args.mutateLoopComposer((draft) => {
        const line = draft.pitchLines[originPitchIndex];
        const step = draft.pitchSteps[originPitchIndex];
        if (line) {
          line.offsetCents = Math.max(-240, Math.min(240, (drag.offsetCents ?? 0) + centsDelta));
          liveLabel = loopLineDisplayLabel(line);
        }
        if (step) step.offsetCents = line?.offsetCents ?? step.offsetCents;
      }, undefined, { history: false });
      if (liveLabel) args.setStatus(`Tonlinie: ${liveLabel}`);
      return;
    }
    if (drag.type === 'guide-drag') {
      if (drag.guideStartBeat == null) return;
      const unitsPerBeat = loopUnitsPerBeat(args.loopComposer);
      const rawBeat = hit.rawUnit / unitsPerBeat;
      const beatsPerBar = Math.max(1, args.loopComposer.beatsPerBar || 4);
      if (drag.guideRepeatPerBar === false && drag.guideId) {
        const clampedBeat = Math.max(0.1, Math.min(Math.max(0.1, args.loopComposer.bars * beatsPerBar - 0.1), rawBeat));
        args.mutateLoopComposer((draft) => {
          draft.timeGuideMarkers = getLoopTimeGuides(draft).map((marker) => marker.id === drag.guideId ? { ...marker, beat: clampedBeat, repeatPerBar: false } : { ...marker });
        }, undefined, { history: false });
        args.setStatus(`Schnittmarker frei: ${clampedBeat.toFixed(2)} Beats`);
        return;
      }
      if (drag.guideGroupIndex == null) return;
      const baseBeat = drag.guideStartBeat - Math.floor(drag.guideStartBeat / beatsPerBar) * beatsPerBar;
      const localBeat = Math.max(0.1, Math.min(beatsPerBar - 0.1, baseBeat + (rawBeat - drag.guideStartBeat)));
      args.mutateLoopComposer((draft) => {
        const safeBeats = Math.max(1, draft.beatsPerBar || 4);
        draft.timeGuideMarkers = getLoopTimeGuides(draft).map((marker) => {
          if (marker.kind !== 'guide') return { ...marker };
          const match = /guide-(\d+)-(\d+)/.exec(marker.id);
          const groupIndex = match ? Number(match[2]) : 0;
          if (groupIndex !== drag.guideGroupIndex) return { ...marker };
          const barIndex = Math.floor(marker.beat / safeBeats);
          return { ...marker, beat: barIndex * safeBeats + localBeat, repeatPerBar: true };
        });
      }, undefined, { history: false });
      args.setStatus(`Guide-Marker: ${localBeat.toFixed(2)} Beats im Takt`);
      return;
    }
    if (drag.type === 'box-select') {
      if (!hit.inGrid) return;
      const box = normalizeLoopSelectionBox({
        anchorUnit: drag.boxAnchorStep ?? hit.rawUnit,
        headUnit: hit.rawUnit,
        anchorChannelIndex: drag.boxAnchorStepIndex ?? hit.channelIndex,
        headChannelIndex: hit.channelIndex,
      });
      args.setComposerSelectionBox(box);
      args.refreshSelectionFromBox(box, !!event.shiftKey);
      return;
    }
    if (drag.type === 'paint') {
      if (!hit.inGrid || !drag.paintTrackId) return;
      const signature = `${drag.paintTrackId}:${hit.channelIndex}:${hit.rawUnit.toFixed(2)}`;
      if (drag.lastPaintSignature === signature) return;
      drag.lastPaintSignature = signature;
      paintComposerNoteAt(hit.channelIndex, snapLoopComposerMarkerUnit(args.loopComposer, hit.rawUnit, hit.geometry.cellW), drag.paintTrackId);
      return;
    }
    if (!drag.noteId) return;
    args.mutateLoopComposer((draft) => {
      const note = draft.notes.find((entry) => entry.id === drag.noteId);
      if (!note) return;
      const totalUnits = totalComposerSteps(draft);
      if (drag.type === 'note-move') {
        if (drag.pitchAnchorOnly && drag.pitchAnchorTrackId) {
          const offsets = drag.pitchAnchorOffsets ?? {};
          draft.notes.forEach((entry) => {
            if (entry.trackId !== drag.pitchAnchorTrackId || !entry.pendingPitchAnchor) return;
            const offset = offsets[entry.id] ?? 0;
            const channelIndex = Math.max(0, Math.min(draft.pitchLines.length - 1, hit.channelIndex + offset));
            entry.channelIndex = channelIndex;
            entry.lineId = draft.pitchLines[channelIndex]?.id ?? entry.lineId;
            syncLoopNoteToState(draft, entry);
          });
        } else {
          const rawStart = hit.rawUnit - (drag.grabOffsetUnits ?? 0);
          const movedStart = clampLoopComposerUnit(draft, rawStart);
          const maxStart = Math.max(0, totalUnits - noteDurationUnits(draft, note));
          note.startUnit = Math.max(0, Math.min(maxStart, movedStart));
          note.channelIndex = hit.channelIndex;
          note.lineId = draft.pitchLines[hit.channelIndex]?.id ?? note.lineId;
        }
      } else if (drag.type === 'note-resize-start') {
        const previousDurationUnits = noteDurationUnits(draft, note);
        const originalEnd = drag.anchorEndUnit ?? ((drag.startStep ?? noteStartUnit(draft, note)) + (drag.lengthSteps ?? noteDurationUnits(draft, note)));
        const nextStart = Math.max(0, Math.min(originalEnd - 0.125, hit.rawUnit));
        note.startUnit = nextStart;
        note.durationUnits = clampComposerLength(originalEnd - nextStart);
        retimeMaterialLoopBodyForDurationChange(note, previousDurationUnits, note.durationUnits);
      } else if (drag.type === 'note-resize-end') {
        const previousDurationUnits = noteDurationUnits(draft, note);
        const lockedStart = drag.anchorStartUnit ?? (drag.startStep ?? noteStartUnit(draft, note));
        const nextEnd = Math.max(lockedStart + 0.125, hit.rawUnit);
        note.startUnit = lockedStart;
        note.durationUnits = clampComposerLength(Math.min(totalUnits - lockedStart, nextEnd - lockedStart));
        retimeMaterialLoopBodyForDurationChange(note, previousDurationUnits, note.durationUnits);
      }
      syncLoopNoteToState(draft, note);
    }, undefined, { history: false });
    if (drag.type === 'note-move') {
      const liveNote = args.loopComposer.notes.find((entry) => entry.id === drag.noteId) ?? null;
      if (drag.pitchAnchorOnly && liveNote && isMaterialImportBody(liveNote)) {
        const candidate = { ...liveNote, channelIndex: hit.channelIndex, pendingPitchAnchor: false } as LoopNoteEvent;
        candidate.anchorHz = resolveMaterialGridHz(args.loopComposer, candidate);
        void args.previewComposerGesture({
          trackId: liveNote.trackId,
          channelIndex: hit.channelIndex,
          note: candidate,
          statusLabel: `Raw-Ankergriffstufe vorgehört · ${candidate.anchorHz.toFixed(2)} Hz`,
        });
      } else if (!drag.pitchAnchorOnly) {
        void args.previewComposerGesture({
          trackId: liveNote?.trackId ?? args.loopComposer.selectedTrackId,
          channelIndex: hit.channelIndex,
          note: liveNote ? { ...liveNote, channelIndex: hit.channelIndex } as LoopNoteEvent : null,
          statusLabel: 'Rasterschritt vorgehört.',
        });
      }
    }
  };

  const handleLoopComposerMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    handleLoopComposerMoveLike({ clientX: event.clientX, clientY: event.clientY, shiftKey: event.shiftKey });
  };

  const handleLoopComposerContextMenu = (event: React.MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    releaseComposerInteractions();
    const hit = args.clipComposerRef.current ? hitLoopComposerCanvas(args.clipComposerRef.current, event.clientX, event.clientY, args.loopComposer, { lockTrackEditing: args.lockTrackEditing, materialFragmentPrepActive: args.materialFragmentPrepActive }) : null;
    if (hit?.inHeader && hit.headerGuide && args.materialFragmentPrepActive && isLoopEditableFragmentCutMarker(args.loopComposer, hit.headerGuide)) {
      const headerGuide = hit.headerGuide;
      args.mutateLoopComposer((draft) => {
        draft.timeGuideMarkers = getLoopTimeGuides(draft).filter((marker) => marker.id !== headerGuide.id);
      }, 'Schnittmarker entfernt.');
      return;
    }
    if (!hit?.note) return;
    const note = hit.note;
    args.setSelectedLoopNoteIds((state) => state.filter((id) => id !== note.id));
    args.mutateLoopComposer((draft) => {
      draft.notes = draft.notes.filter((entry) => entry.id !== note.id);
      if (draft.selectedNoteId === note.id) draft.selectedNoteId = null;
      pruneEmptyDynamicImportTracks(draft);
    }, 'Note entfernt.');
  };

  const {
    handleLoopComposerWheel,
    startComposerViewportDrag,
    jumpComposerViewportToPointer,
    startComposerVerticalViewportDrag,
    jumpComposerVerticalViewportToPointer,
    handleComposerViewportPointerMove,
  } = useCanonicalLoopComposerViewportInteractions({
    clipComposerRef: args.clipComposerRef,
    composerOverviewRef: args.composerOverviewRef,
    composerVerticalOverviewRef: args.composerVerticalOverviewRef,
    composerViewportDragRef: args.composerViewportDragRef,
    composerVerticalViewportDragRef: args.composerVerticalViewportDragRef,
    loopComposer: args.loopComposer,
    mutateLoopComposer: args.mutateLoopComposer,
  });

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (handleComposerViewportPointerMove(event)) return;
      if (args.composerDragRef.current) {
        handleLoopComposerMoveLike({ clientX: event.clientX, clientY: event.clientY, shiftKey: event.shiftKey });
      }
    };
    const handleMouseUp = () => {
      if (args.composerDragRef.current || args.composerViewportDragRef.current || args.composerVerticalViewportDragRef.current) {
        releaseComposerInteractions();
      }
    };
    const handleWindowBlur = () => {
      handleMouseUp();
    };
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleMouseUp();
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [
    args.composerDragRef,
    args.composerViewportDragRef,
    args.composerVerticalViewportDragRef,
    handleComposerViewportPointerMove,
    args.loopComposer,
    args.lockTrackEditing,
    args.autoZoomOnDenseOverlap,
    args.selectedLoopNoteIds,
    args.chordVoicing,
    args.chordStrumSteps,
    args.chordVelocitySlope,
    args.mutateLoopComposer,
    args.refreshSelectionFromBox,
    args.previewComposerGesture,
    args.setSelectedLoopNoteIds,
    args.setComposerSelectionBox,
    args.setComposerHover,
    args.setComposerCursor,
    args.setShowChordGhost,
    args.setDenseOverlapWarning,
    args.setStatus,
  ]);

  return {
    releaseComposerInteractions,
    handleLoopComposerDown,
    handleLoopComposerMove,
    handleLoopComposerContextMenu,
    handleLoopComposerWheel,
    startComposerViewportDrag,
    jumpComposerViewportToPointer,
    startComposerVerticalViewportDrag,
    jumpComposerVerticalViewportToPointer,
  };
}
