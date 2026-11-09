import type { CanonicalLoopComposerRepetitionModel, CanonicalLoopComposerTuning, CanonicalToolSettings } from './sessionTypes';
import { clampBars } from '../spectralForge/state/storeMaterialExport';
import {
  createDefaultLoopTimeGuides,
  derivePitchStepsFromLines,
  getDefaultRepetitionModelForTuning,
  hydrateLoopNoteEvent,
  inferLoopSegmentCount,
  noteChannelIndex,
  noteDurationUnits,
  noteStartUnit,
  syncLoopNoteToState,
} from './loopGridKernel';
import type {
  LoopTrackPatternPreset,
  LoopCompositionPreset,
  LoopTrack,
  LoopNoteEvent,
  LoopNoteSelectionBox,
  LoopComposerState,
  LoopComposerHydrationState,
} from './loopDrumDomainTypes';

import { DEFAULT_GROOVE_MACHINE } from './loopDrumComputerDomain';
import { createLoopPitchLinesFromTuning, rebuildLoopComposerPitchField } from './loopPitchDomain';
import { buildLoopComposerFromMicrotoSeedOwned } from './loopMicrotoDomain';
import {
  DEFAULT_LOOP_TRACKS,
  buildBassPatternNotes,
  buildCompanionPatternNotes,
  buildTrackPatternNotes,
  defaultLoopTrackLabel,
  defaultLoopTrackPatternPreset,
  getLoopCompositionPresetMeta,
} from './loopCompositionDomain';

export {
  LOOP_COMPOSER_MAX_VISIBLE_LINES,
  loopLineDisplayLabel,
  rebuildLoopComposerPitchField,
  buildLoopLineLayout,
  getLoopNoteLineRect,
  getLoopNoteScreenRect,
  createLoopPitchLinesFromTuning,
} from './loopPitchDomain';
export {
  LOOP_COMPOSITION_PRESETS,
  DEFAULT_LOOP_TRACKS,
  clamp01,
  getLoopCompositionPresetMeta,
  defaultLoopTrackLabel,
  totalComposerSteps,
  chordIntervalsForVoicing,
  makeLoopNote,
  buildChordGhostNotes,
  buildChordNotesFromStep,
  clampComposerLength,
  buildBassPatternNotes,
  buildCompanionPatternNotes,
  defaultLoopTrackPatternPreset,
  buildTrackPatternNotes,
} from './loopCompositionDomain';
export {
  DEFAULT_GROOVE_MACHINE,
  DRUM_LANE_LABELS,
  DRUM_LANE_COLORS,
  drumPatternMatrixToState,
  createEmptyDrumComputer,
  sanitizeGrooveMachineConfig,
  cloneGrooveMachineConfig,
  cloneDrumComputerState,
  resizeDrumComputerState,
  cycleDrumCellValue,
  countActiveDrumSteps,
} from './loopDrumComputerDomain';
export type {
  GrooveMachineConfig,
  DrumVoiceId,
  DrumComputerState,
  DrumViewportState,
  LoopAutocorrectSuggestion,
  StampPhase,
  LoopPitchStep,
  LoopTrackPatternPreset,
  LoopCompositionPreset,
  LoopTrack,
  LoopPitchLine,
  LoopTimeGuideMarker,
  LoopNoteRenderSourceKind,
  LoopMaterialPitchMode,
  CarrierIntegralPinkVariant,
  CarrierIntegralFieldVoiceEvent,
  CarrierIntegralFieldClip,
  LoopNoteEvent,
  LoopGhostNote,
  LoopNoteSelectionBox,
  ChordVoicing,
  PendingImageImport,
  LoopComposerState,
  LoopComposerHydrationState,
  DrumComputerHydrationState,
} from './loopDrumDomainTypes';



export const MAX_HISTORY = 32;
export const DEFAULT_TOOL_SETTINGS: CanonicalToolSettings = {
  brushSize: 20,
  intensity: 0.4,
  hardness: 0.42,
  eraseMode: false,
  morphMode: 'push',
};
export const LOOP_COMPOSER_GUTTER_W = 152;
export const LOOP_COMPOSER_HEADER_H = 58;




export const TUNING_DEFAULT_REPETITION: Record<string, CanonicalLoopComposerRepetitionModel> = {
  ji: 'octave',
  gamelan: 'octave',
  maqam: 'octave',
  '12edo': 'octave',
  '17edo': 'octave',
  '19edo': 'octave',
  '22edo': 'octave',
  '31edo': 'octave',
  bp: 'tritave',
};

export {
  centeredRegisterOffsets,
  canonicalLoopNoteOctaveOffset,
  composerChannelCount,
  composerRepetitionRatio,
  createDefaultLoopTimeGuides,
  derivePitchStepsFromLines,
  effectiveLoopLineHz,
  getDefaultRepetitionModelForTuning,
  getLoopTimeGuides,
  isLoopActiveFragmentCutMarker,
  isLoopEditableFragmentCutMarker,
  isLoopInternalBarTimeGuideMarker,
  hydrateLoopNoteEvent,
  inferLoopSegmentCount,
  loopLineBaseLabel,
  loopUnitToLabel,
  loopUnitsPerBeat,
  noteChannelIndex,
  noteDurationUnits,
  noteFadeInUnits,
  noteFadeOutUnits,
  noteStartUnit,
  parseLoopLineIndex,
  parseLoopPitchIndex,
  remapLoopNotesToPitchLines,
  resolveLoopNoteInstrumentPreset,
  resolveLoopNoteSampleId,
  sortLoopPitchLinesDescending,
  syncLoopNoteToState,
  totalLoopUnits,
} from './loopGridKernel';

export function createEmptyLoopComposer(bars = DEFAULT_GROOVE_MACHINE.barsInterpretation): LoopComposerState {
  const tuning: CanonicalLoopComposerTuning = 'ji';
  const baseHz = 220;
  const pitchLines = createLoopPitchLinesFromTuning(tuning, baseHz);
  return {
    pitchSteps: derivePitchStepsFromLines(pitchLines, baseHz),
    pitchLines,
    timeGuideMarkers: createDefaultLoopTimeGuides(bars, 4, 4),
    tracks: DEFAULT_LOOP_TRACKS.map((track) => ({ ...track })),
    notes: [],
    selectedTrackId: 'bass',
    selectedNoteId: null,
    compositionPresetId: 'jazz',
    tuning,
    repetitionModel: getDefaultRepetitionModelForTuning(tuning),
    baseHz,
    beatsPerBar: 4,
    stepsPerBar: 16,
    segmentCount: 4,
    bars,
    zoom: 1,
    scrollX: 0,
    zoomY: 1,
    scrollY: 0,
    activeTrackIds: DEFAULT_LOOP_TRACKS.map((track) => track.id),
  };
}


export {
  mapMicrotoTuningToCanonical,
  trackIdForMicrotoMovementKind,
  velocityForMicrotoMovement,
  durationUnitsForMicrotoMovement,
  lineIndexFromMicrotoSemi,
} from './loopMicrotoDomain';

export function buildLoopComposerFromMicrotoSeed(
  seed: Parameters<typeof buildLoopComposerFromMicrotoSeedOwned>[0],
): LoopComposerState {
  return buildLoopComposerFromMicrotoSeedOwned(seed, { createEmptyLoopComposer, cloneLoopComposerState });
}

export function hydrateLoopTrack(track: LoopTrack, index: number): LoopTrack {
  const fallback = DEFAULT_LOOP_TRACKS.find((entry) => entry.id === track.id) ?? DEFAULT_LOOP_TRACKS[index] ?? DEFAULT_LOOP_TRACKS[0];
  const label = track.label && !/^Lane [A-C]$/i.test(track.label) ? track.label : defaultLoopTrackLabel(track.id, index);
  return { ...fallback, ...track, label, instrumentPreset: track.instrumentPreset ?? fallback.instrumentPreset, patternPresetId: track.patternPresetId ?? fallback.patternPresetId, pan: track.pan ?? fallback.pan };
}

export function cloneLoopComposerState(state: LoopComposerHydrationState): LoopComposerState {
  const baseHz = Number.isFinite(state.baseHz) ? state.baseHz : 220;
  const beatsPerBar = state.beatsPerBar ?? 4;
  const pitchLines = state.pitchLines?.length ? state.pitchLines.map((line) => ({ ...line })) : createLoopPitchLinesFromTuning(state.tuning ?? 'ji', baseHz);
  const pitchSteps = state.pitchSteps?.length ? state.pitchSteps.map((step) => ({ ...step })) : derivePitchStepsFromLines(pitchLines, baseHz);
  const segmentCount = inferLoopSegmentCount(state);
  const nextStateBase = { pitchSteps, pitchLines, stepsPerBar: state.stepsPerBar, beatsPerBar, bars: state.bars };
  return {
    pitchSteps,
    pitchLines,
    timeGuideMarkers: state.timeGuideMarkers?.length
      ? state.timeGuideMarkers.map((marker) => ({ ...marker }))
      : createDefaultLoopTimeGuides(state.bars, beatsPerBar, segmentCount),
    tracks: state.tracks.map((track, index) => hydrateLoopTrack(track, index)),
    notes: state.notes.map((note) => hydrateLoopNoteEvent(nextStateBase, { ...note })),
    selectedTrackId: state.selectedTrackId,
    selectedNoteId: state.selectedNoteId,
    compositionPresetId: state.compositionPresetId ?? 'jazz',
    tuning: state.tuning ?? '12edo',
    repetitionModel: state.repetitionModel ?? getDefaultRepetitionModelForTuning(state.tuning ?? '12edo'),
    baseHz,
    beatsPerBar,
    stepsPerBar: state.stepsPerBar,
    segmentCount,
    bars: state.bars,
    zoom: state.zoom,
    scrollX: state.scrollX,
    zoomY: state.zoomY ?? 1,
    scrollY: state.scrollY ?? 0,
    activeTrackIds: [...state.activeTrackIds],
  };
}



export function composerTrackById(state: LoopComposerState, trackId: string) {
  return state.tracks.find((track) => track.id === trackId) ?? state.tracks[0];
}

export function notesAtGridCell(
  state: LoopComposerState,
  channelIndex: number,
  gridUnit: number,
  preferredTrackId?: string,
  preferredNoteId?: string | null,
) {
  return state.notes
    .filter((entry) => noteChannelIndex(state, entry) === channelIndex && gridUnit >= noteStartUnit(state, entry) && gridUnit < noteStartUnit(state, entry) + noteDurationUnits(state, entry))
    .sort((a, b) => {
      if (preferredNoteId) {
        const aSelected = a.id === preferredNoteId ? 1 : 0;
        const bSelected = b.id === preferredNoteId ? 1 : 0;
        if (aSelected !== bSelected) return bSelected - aSelected;
      }
      if (preferredTrackId) {
        const aPref = a.trackId === preferredTrackId ? 1 : 0;
        const bPref = b.trackId === preferredTrackId ? 1 : 0;
        if (aPref !== bPref) return bPref - aPref;
      }
      if (noteDurationUnits(state, a) !== noteDurationUnits(state, b)) return noteDurationUnits(state, a) - noteDurationUnits(state, b);
      return noteStartUnit(state, a) - noteStartUnit(state, b);
    });
}

export function overlapCountAtCell(state: LoopComposerState, channelIndex: number, gridUnit: number) {
  return notesAtGridCell(state, channelIndex, gridUnit).length;
}

export function normalizeLoopSelectionBox(box: {
  anchorUnit: number;
  headUnit: number;
  anchorChannelIndex: number;
  headChannelIndex: number;
}): LoopNoteSelectionBox {
  return {
    startUnit: Math.min(box.anchorUnit, box.headUnit),
    endUnit: Math.max(box.anchorUnit, box.headUnit),
    startChannelIndex: Math.min(box.anchorChannelIndex, box.headChannelIndex),
    endChannelIndex: Math.max(box.anchorChannelIndex, box.headChannelIndex),
  };
}

export function noteIntersectsLoopSelection(state: LoopComposerState, note: LoopNoteEvent, box: LoopNoteSelectionBox) {
  const channelIndex = noteChannelIndex(state, note);
  if (channelIndex < box.startChannelIndex || channelIndex > box.endChannelIndex) return false;
  const noteStart = noteStartUnit(state, note);
  const noteEnd = noteStart + noteDurationUnits(state, note);
  return noteEnd >= box.startUnit && noteStart <= box.endUnit;
}



export function applyLoopCompositionPreset(state: LoopComposerState, presetId: LoopCompositionPreset, bars = state.bars): LoopComposerState {
  const meta = getLoopCompositionPresetMeta(presetId);
  const next = cloneLoopComposerState({ ...state, bars: clampBars(bars) });
  next.compositionPresetId = presetId;
  next.tuning = meta.tuning;
  next.repetitionModel = meta.repetitionModel ?? getDefaultRepetitionModelForTuning(meta.tuning);
  next.baseHz = meta.baseHz;
  next.bars = clampBars(bars);
  next.pitchLines = rebuildLoopComposerPitchField(next).nextPitchLines;
  next.pitchSteps = rebuildLoopComposerPitchField(next).nextPitchSteps;
  next.timeGuideMarkers = createDefaultLoopTimeGuides(next.bars, next.beatsPerBar, inferLoopSegmentCount(next));
  next.tracks = next.tracks.map((track, index) => ({
    ...track,
    label: defaultLoopTrackLabel(track.id, index),
    instrumentPreset: meta.instrumentPresets[track.id] ?? track.instrumentPreset,
    patternPresetId: meta.defaultTrackPatterns[track.id] ?? track.patternPresetId ?? 'patternA',
    enabled: true,
  }));
  next.activeTrackIds = next.tracks.map((track) => track.id);
  next.notes = [];
  next.tracks.forEach((track) => {
    next.notes.push(...buildTrackPatternNotes(track.id, track.patternPresetId ?? 'patternA', next));
  });
  next.notes = next.notes.map((note) => syncLoopNoteToState(next, note)).sort((a, b) => noteStartUnit(next, a) - noteStartUnit(next, b));
  next.selectedTrackId = next.tracks[0]?.id ?? 'bass';
  next.selectedNoteId = next.notes[0]?.id ?? null;
  return cloneLoopComposerState(next);
}
export function applyLoopTrackPatternPreset(draft: LoopComposerState, trackId: string, patternPresetId: LoopTrackPatternPreset) {
  if (!draft.compositionPresetId) draft.compositionPresetId = 'jazz';
  const track = draft.tracks.find((entry) => entry.id === trackId);
  if (track) {
    track.patternPresetId = patternPresetId;
    track.enabled = true;
  }
  draft.notes = draft.notes.filter((note) => note.trackId !== trackId);
  draft.notes.push(...buildTrackPatternNotes(trackId, patternPresetId, draft));
  draft.notes = draft.notes.map((note) => syncLoopNoteToState(draft, note)).sort((a, b) => noteStartUnit(draft, a) - noteStartUnit(draft, b));
  if (!draft.activeTrackIds.includes(trackId)) draft.activeTrackIds.push(trackId);
  draft.selectedTrackId = trackId;
  draft.selectedNoteId = draft.notes.find((note) => note.trackId === trackId)?.id ?? null;
}

export function resetLoopComposerTracksToInstrumentPresets(state: LoopComposerState): LoopComposerState {
  const next = cloneLoopComposerState(state);
  next.notes = next.notes.filter((note) => !next.tracks.some((track) => track.id === note.trackId));
  next.tracks.forEach((track) => {
    applyLoopTrackPatternPreset(next, track.id, track.patternPresetId ?? defaultLoopTrackPatternPreset(track.id));
  });
  next.activeTrackIds = next.tracks.map((track) => track.id);
  next.selectedTrackId = next.tracks[0]?.id ?? 'bass';
  next.selectedNoteId = next.notes.find((note) => note.trackId === next.selectedTrackId)?.id ?? next.notes[0]?.id ?? null;
  return cloneLoopComposerState(next);
}

export function buildLoopComposerFromPresets(bassPattern: string, state: LoopComposerState): LoopComposerState {
  const next = cloneLoopComposerState(state);
  next.notes = [
    ...buildBassPatternNotes(bassPattern, next),
    ...buildCompanionPatternNotes(bassPattern, next),
  ];
  next.selectedTrackId = 'bass';
  next.selectedNoteId = next.notes[0]?.id ?? null;
  next.activeTrackIds = ['bass', 'companion'];
  return next;
}

export function buildLoopComposerDemoState(
  bars = DEFAULT_GROOVE_MACHINE.barsInterpretation,
  _bassPattern = DEFAULT_GROOVE_MACHINE.bassPattern,
  compositionPresetId: LoopCompositionPreset = 'jazz',
): LoopComposerState {
  const next = cloneLoopComposerState(createEmptyLoopComposer(bars));
  return applyLoopCompositionPreset(next, compositionPresetId, bars);
}

