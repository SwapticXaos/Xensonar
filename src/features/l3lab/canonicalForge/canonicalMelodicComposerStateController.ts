import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import {
  cloneLoopComposerState,
  createDefaultLoopTimeGuides,
  noteIntersectsLoopSelection,
  noteStartUnit,
  syncLoopNoteToState,
  totalLoopUnits,
  type LoopComposerState,
  type LoopNoteEvent,
  type LoopNoteSelectionBox,
} from './loopDrumDomain';
import { applyLoopComposerVerticalViewportWindow, getLoopComposerVerticalViewport } from './viewportMath';
import { clampBars, clampGuideSegments } from '../spectralForge/state/storeMaterialExport';
import { syncPatternStoresAfterComposerMutation } from './melodicProjectLibrary';
import { pruneEmptyDynamicImportTracks } from './melodicImportLanePolicy';
import {
  commitMelodicPatternStores,
  createLoopComposerWorkspaceSnapshot,
  readMelodicPatternStores,
  type LoopComposerWorkspaceSnapshot,
  type MelodicPatternLinkMap,
  type MelodicPatternVariantMap,
  type MelodicPatternStores,
} from './melodicPatternStoreContract';

export type MutateLoopComposer = (
  updater: (draft: LoopComposerState) => void,
  statusMessage?: string,
  options?: { history?: boolean },
) => void;

export function createCanonicalMelodicComposerStateController(args: {
  loopComposer: LoopComposerState;
  selectedMelodicProjectId: string;
  selectedLoopNoteIds: string[];
  loopPatternVariantsRef: MutableRefObject<MelodicPatternVariantMap>;
  loopPatternLinksRef: MutableRefObject<MelodicPatternLinkMap>;
  setLoopComposer: Dispatch<SetStateAction<LoopComposerState>>;
  setLoopPatternVariants: Dispatch<SetStateAction<MelodicPatternVariantMap>>;
  setLoopPatternLinks: Dispatch<SetStateAction<MelodicPatternLinkMap>>;
  setSelectedLoopNoteIds: Dispatch<SetStateAction<string[]>>;
  setComposerSelectionBox: Dispatch<SetStateAction<LoopNoteSelectionBox | null>>;
  pushLoopComposerUndo: (snapshot: LoopComposerWorkspaceSnapshot) => void;
  setStatus: (status: string) => void;
}) {
  const mutateLoopComposer: MutateLoopComposer = (updater, statusMessage, options) => {
    const shouldRecordHistory = options?.history !== false;
    let nextStores: MelodicPatternStores = readMelodicPatternStores({
      patternVariantsRef: args.loopPatternVariantsRef,
      patternLinksRef: args.loopPatternLinksRef,
    });
    args.setLoopComposer((state) => {
      const previous = cloneLoopComposerState(state);
      const next = cloneLoopComposerState(state);
      updater(next);
      const changed = JSON.stringify(previous) !== JSON.stringify(next);
      if (changed) {
        const previousStores = readMelodicPatternStores({
          patternVariantsRef: args.loopPatternVariantsRef,
          patternLinksRef: args.loopPatternLinksRef,
        });
        nextStores = syncPatternStoresAfterComposerMutation({
          previousComposer: previous,
          nextComposer: next,
          variants: previousStores.variants,
          links: previousStores.links,
        });
        if (shouldRecordHistory) {
          args.pushLoopComposerUndo(createLoopComposerWorkspaceSnapshot({
            composer: previous,
            patternVariants: previousStores.variants,
            patternLinks: previousStores.links,
            selectedMelodicProjectId: args.selectedMelodicProjectId,
          }));
        }
      }
      return next;
    });
    commitMelodicPatternStores({
      stores: nextStores,
      patternVariantsRef: args.loopPatternVariantsRef,
      patternLinksRef: args.loopPatternLinksRef,
      setLoopPatternVariants: args.setLoopPatternVariants,
      setLoopPatternLinks: args.setLoopPatternLinks,
    });
    if (statusMessage) args.setStatus(statusMessage);
  };

  const handleLoopBarsChange = (bars: number) => {
    const nextBars = clampBars(bars || args.loopComposer.bars);
    mutateLoopComposer((draft) => {
      draft.bars = nextBars;
      draft.timeGuideMarkers = createDefaultLoopTimeGuides(nextBars, draft.beatsPerBar, draft.segmentCount);
      const maxUnits = totalLoopUnits(draft);
      draft.notes = draft.notes
        .map((note) => syncLoopNoteToState(draft, { ...note }))
        .filter((note) => noteStartUnit(draft, note) < maxUnits);
      if (draft.selectedNoteId && !draft.notes.some((note) => note.id === draft.selectedNoteId)) {
        draft.selectedNoteId = draft.notes[0]?.id ?? null;
      }
      pruneEmptyDynamicImportTracks(draft);
      draft.scrollX = Math.max(0, Math.min(1, draft.scrollX));
    }, `Melodic Loop: ${nextBars} Takte.`);
  };

  const handleLoopSegmentCountChange = (segmentCount: number) => {
    const nextSegmentCount = clampGuideSegments(segmentCount || args.loopComposer.segmentCount);
    mutateLoopComposer((draft) => {
      draft.segmentCount = nextSegmentCount;
      draft.timeGuideMarkers = createDefaultLoopTimeGuides(draft.bars, draft.beatsPerBar, nextSegmentCount);
      draft.notes = draft.notes.map((note) => syncLoopNoteToState(draft, { ...note }));
    }, `Melodic Loop: ${nextSegmentCount} Taktsegmente.`);
  };

  const refreshSelectionFromBox = (box: LoopNoteSelectionBox, keepExisting = false) => {
    const matches = args.loopComposer.notes
      .filter((note) => noteIntersectsLoopSelection(args.loopComposer, note, box))
      .map((note) => note.id);
    args.setSelectedLoopNoteIds((state) => {
      if (!keepExisting) return matches;
      return Array.from(new Set([...state, ...matches]));
    });
    if (matches.length > 0) {
      const first = args.loopComposer.notes.find((note) => note.id === matches[0]);
      if (first) {
        mutateLoopComposer((draft) => {
          draft.selectedNoteId = first.id;
          draft.selectedTrackId = first.trackId;
        }, undefined, { history: false });
      }
    }
  };

  const applyToSelectedNotes = (mutator: (note: LoopNoteEvent, state: LoopComposerState) => void, statusMessage?: string) => {
    if (args.selectedLoopNoteIds.length === 0) return;
    mutateLoopComposer((draft) => {
      draft.notes.forEach((note) => {
        if (!args.selectedLoopNoteIds.includes(note.id)) return;
        mutator(note, draft);
      });
    }, statusMessage);
  };

  const clearSelectedNotes = () => {
    if (args.selectedLoopNoteIds.length === 0) return;
    mutateLoopComposer((draft) => {
      draft.notes = draft.notes.filter((note) => !args.selectedLoopNoteIds.includes(note.id));
      if (draft.selectedNoteId && args.selectedLoopNoteIds.includes(draft.selectedNoteId)) {
        draft.selectedNoteId = null;
      }
      pruneEmptyDynamicImportTracks(draft);
    }, `${args.selectedLoopNoteIds.length} Noten gelöscht.`);
    args.setSelectedLoopNoteIds([]);
    args.setComposerSelectionBox(null);
  };

  const shiftPitchWindow = (delta: number) => {
    if (!delta) return;
    mutateLoopComposer((draft) => {
      const viewport = getLoopComposerVerticalViewport(draft);
      const jump = Math.max(1, Math.round(viewport.visibleLines * 0.42));
      applyLoopComposerVerticalViewportWindow(draft, viewport.scrollStart + delta * jump, viewport.visibleLines);
    }, delta > 0 ? 'Pitch-Fenster nach unten verschoben.' : 'Pitch-Fenster nach oben verschoben.');
  };

  const updateSelectedNote = (updater: (note: LoopNoteEvent) => void) => {
    mutateLoopComposer((draft) => {
      const note = draft.notes.find((entry) => entry.id === draft.selectedNoteId);
      if (!note) return;
      updater(note);
      syncLoopNoteToState(draft, note);
    });
  };

  return {
    mutateLoopComposer,
    handleLoopBarsChange,
    handleLoopSegmentCountChange,
    refreshSelectionFromBox,
    applyToSelectedNotes,
    clearSelectedNotes,
    shiftPitchWindow,
    updateSelectedNote,
  };
}
