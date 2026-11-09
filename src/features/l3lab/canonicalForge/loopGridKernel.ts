import type { CanonicalLoopComposerRepetitionModel, CanonicalLoopComposerTuning } from './sessionTypes';
import {
  createDefaultPatternTimeGuides,
  inferPatternSegmentCount,
  parsePatternIndexFromId,
  patternUnitToLabel,
  patternUnitsPerBeat,
  totalPatternUnits,
} from '../../loopEngine/loopEngineGrid';
import type { LoopTrackInstrumentPreset } from './melodicSoundRegistry';
import { getRasterDefinition } from '../../xensonar/domain/instrumentData';
import { sanitizeLocalFieldState } from './localField';
import type {
  LoopComposerState,
  LoopNoteEvent,
  LoopNoteRenderSourceKind,
  LoopPitchLine,
  LoopPitchStep,
  LoopTimeGuideMarker,
} from './loopDrumDomainTypes';
import { isMaterialImportBody } from './loopImportExportContracts';

export function getDefaultRepetitionModelForTuning(tuning: CanonicalLoopComposerTuning): CanonicalLoopComposerRepetitionModel {
  return getRasterDefinition(tuning)?.periodFamily === 'tritave' ? 'tritave' : 'octave';
}

export function composerRepetitionRatio(model: CanonicalLoopComposerRepetitionModel) {
  return model === 'tritave' ? 3 : 2;
}

export function centeredRegisterOffsets(count: number) {
  const safeCount = Math.max(1, Math.round(count));
  const start = -Math.floor(safeCount / 2);
  return Array.from({ length: safeCount }, (_, index) => start + index);
}

export function parseLoopPitchIndex(stepId?: string) {
  return parsePatternIndexFromId('step-', stepId);
}

export function parseLoopLineIndex(lineId?: string) {
  return parsePatternIndexFromId('line-', lineId);
}

export function loopUnitsPerBeat(state: Pick<LoopComposerState, 'stepsPerBar' | 'beatsPerBar'>) {
  return patternUnitsPerBeat(state);
}

export function totalLoopUnits(state: Pick<LoopComposerState, 'stepsPerBar' | 'bars'>) {
  return totalPatternUnits(state);
}

export function derivePitchStepsFromLines(lines: LoopPitchLine[], baseHz: number): LoopPitchStep[] {
  const safeBase = Math.max(30, Math.min(1200, Number.isFinite(baseHz) ? baseHz : 220));
  return lines.map((line, index) => ({
    id: `step-${index}`,
    label: line.label,
    ratio: line.hz / safeBase,
    cents: line.cents,
    offsetCents: line.offsetCents,
    muted: line.muted,
  }));
}

export function effectiveLoopLineHz(line: LoopPitchLine) {
  return line.hz * Math.pow(2, (line.offsetCents ?? 0) / 1200);
}

export function sortLoopPitchLinesDescending(lines: LoopPitchLine[]) {
  return [...lines]
    .sort((a, b) => effectiveLoopLineHz(b) - effectiveLoopLineHz(a))
    .map((line, index) => ({ ...line, id: `line-${index}` }));
}

export function noteChannelIndex(state: Pick<LoopComposerState, 'pitchSteps' | 'pitchLines'>, note: LoopNoteEvent) {
  const fromLine = parseLoopLineIndex(note.lineId);
  const fromChannel = Number.isFinite(note.channelIndex) ? note.channelIndex : parseLoopPitchIndex(note.stepId);
  const idx = fromLine >= 0 ? fromLine : (fromChannel >= 0 ? fromChannel : 0);
  const maxIndex = Math.max(0, Math.min(state.pitchLines.length || state.pitchSteps.length, state.pitchSteps.length) - 1);
  return Math.max(0, Math.min(maxIndex, idx));
}

export function noteStartUnit(state: Pick<LoopComposerState, 'stepsPerBar' | 'beatsPerBar' | 'bars'>, note: LoopNoteEvent) {
  const unitsPerBeat = loopUnitsPerBeat(state);
  const fromUnit = Number.isFinite(note.startUnit) ? Number(note.startUnit) : null;
  const fromStep = Number.isFinite(note.startStep) ? Number(note.startStep) : null;
  const fromBeat = Number.isFinite(note.startBeat) ? Number(note.startBeat) * unitsPerBeat : null;
  const raw = fromUnit ?? fromStep ?? fromBeat ?? 0;
  return Math.max(0, Math.min(totalLoopUnits(state), raw));
}

export function noteDurationUnits(state: Pick<LoopComposerState, 'stepsPerBar' | 'beatsPerBar' | 'bars'>, note: LoopNoteEvent) {
  const unitsPerBeat = loopUnitsPerBeat(state);
  const fromUnits = Number.isFinite(note.durationUnits) ? Number(note.durationUnits) : null;
  const fromSteps = Number.isFinite(note.lengthSteps) ? Number(note.lengthSteps) : null;
  const fromBeat = Number.isFinite(note.startBeat) && Number.isFinite(note.endBeat)
    ? Math.max(0.125, (Number(note.endBeat) - Number(note.startBeat)) * unitsPerBeat)
    : null;
  const raw = fromUnits ?? fromSteps ?? fromBeat ?? 1;
  return Math.max(0.125, Math.min(totalLoopUnits(state), raw));
}

export function noteFadeInUnits(note: LoopNoteEvent) {
  return Math.max(0, Number.isFinite(note.fadeInUnits) ? note.fadeInUnits : (note.fadeInSteps ?? 0));
}

export function noteFadeOutUnits(note: LoopNoteEvent) {
  return Math.max(0, Number.isFinite(note.fadeOutUnits) ? note.fadeOutUnits : (note.fadeOutSteps ?? 0));
}

export function resolveLoopNoteInstrumentPreset(
  state: Pick<LoopComposerState, 'tracks'>,
  note: Pick<LoopNoteEvent, 'trackId' | 'instrumentPresetOverride'> | null | undefined,
): LoopTrackInstrumentPreset | undefined {
  if (!note) return undefined;
  const override = typeof note.instrumentPresetOverride === 'string' && note.instrumentPresetOverride.trim()
    ? note.instrumentPresetOverride
    : null;
  if (override) return override;
  return state.tracks.find((track) => track.id === note.trackId)?.instrumentPreset;
}

export function resolveLoopNoteSampleId(state: Pick<LoopComposerState, 'tracks'>, note: Pick<LoopNoteEvent, 'trackId' | 'instrumentPresetOverride'> | null | undefined) {
  const preset = resolveLoopNoteInstrumentPreset(state, note);
  if (typeof preset !== 'string' || !preset.startsWith('sample:')) return null;
  return preset.slice('sample:'.length) || null;
}

const LOOP_NOTE_RENDER_SOURCE_KINDS: LoopNoteRenderSourceKind[] = ['synth-live', 'synth-frozen-sample', 'material-import', 'sample-block'];

export function normalizeLoopNoteRenderSourceKind(value: unknown): LoopNoteRenderSourceKind | null {
  return typeof value === 'string' && LOOP_NOTE_RENDER_SOURCE_KINDS.includes(value as LoopNoteRenderSourceKind)
    ? value as LoopNoteRenderSourceKind
    : null;
}

// Melodic Loop pitch contract: visible pitch lines are the only persistent register
// anchor for notes. Legacy per-note octave offsets made two blocks on the same
// line sound differently; hydration now collapses that hidden register axis.
export const LOOP_CANONICAL_NOTE_OCTAVE_OFFSET = 0;

export function canonicalLoopNoteOctaveOffset(_note?: Pick<LoopNoteEvent, 'octaveOffset' | 'noteClass' | 'renderSourceKind'> | null) {
  return LOOP_CANONICAL_NOTE_OCTAVE_OFFSET;
}

export function resolveLoopNoteRenderSourceKind(
  state: Pick<LoopComposerState, 'tracks'>,
  note: Pick<LoopNoteEvent, 'trackId' | 'instrumentPresetOverride' | 'noteClass' | 'renderSourceKind'> | null | undefined,
): LoopNoteRenderSourceKind {
  const explicit = normalizeLoopNoteRenderSourceKind(note?.renderSourceKind);
  if (explicit) return explicit;
  if (isMaterialImportBody(note)) return 'material-import';
  const preset = resolveLoopNoteInstrumentPreset(state, note);
  if (typeof preset === 'string' && preset.startsWith('sample:')) return 'sample-block';
  return 'synth-live';
}

export function loopNoteUsesModulationFieldInterpretation(
  state: Pick<LoopComposerState, 'tracks'>,
  note: Pick<LoopNoteEvent, 'trackId' | 'instrumentPresetOverride' | 'noteClass' | 'renderSourceKind'> | null | undefined,
) {
  return resolveLoopNoteRenderSourceKind(state, note) === 'synth-live';
}

export function createDefaultLoopTimeGuides(bars: number, beatsPerBar = 4, segmentCount = 4): LoopTimeGuideMarker[] {
  return createDefaultPatternTimeGuides(bars, beatsPerBar, segmentCount);
}

export function inferLoopSegmentCount(state: Partial<Pick<LoopComposerState, 'segmentCount' | 'timeGuideMarkers' | 'bars'>>): number {
  return inferPatternSegmentCount(state);
}

export function hydrateLoopNoteEvent(
  state: Pick<LoopComposerState, 'pitchSteps' | 'pitchLines' | 'stepsPerBar' | 'beatsPerBar' | 'bars'>,
  note: LoopNoteEvent,
): LoopNoteEvent {
  const channelIndex = noteChannelIndex(state, note);
  const startUnit = noteStartUnit(state, note);
  const durationUnits = noteDurationUnits(state, note);
  const fadeInUnits = noteFadeInUnits(note);
  const fadeOutUnits = noteFadeOutUnits(note);
  const unitsPerBeat = loopUnitsPerBeat(state);
  const startBeat = startUnit / unitsPerBeat;
  const endBeat = (startUnit + durationUnits) / unitsPerBeat;
  return {
    ...note,
    channelIndex,
    octaveOffset: canonicalLoopNoteOctaveOffset(note),
    lineId: state.pitchLines[channelIndex]?.id ?? `line-${channelIndex}`,
    stepId: state.pitchSteps[channelIndex]?.id ?? `step-${channelIndex}`,
    startUnit,
    startStep: Math.round(startUnit),
    durationUnits,
    lengthSteps: Math.max(1, Math.round(durationUnits)),
    startBeat,
    endBeat,
    fadeInUnits,
    fadeInSteps: Math.round(fadeInUnits),
    fadeOutUnits,
    fadeOutSteps: Math.round(fadeOutUnits),
    renderSourceKind: normalizeLoopNoteRenderSourceKind(note.renderSourceKind),
    localField: note.localField ? sanitizeLocalFieldState(note.localField) : null,
  };
}

export function syncLoopNoteToState(
  state: Pick<LoopComposerState, 'pitchSteps' | 'pitchLines' | 'stepsPerBar' | 'beatsPerBar' | 'bars'>,
  note: LoopNoteEvent,
) {
  const hydrated = hydrateLoopNoteEvent(state, note);
  Object.assign(note, hydrated);
  return note;
}

export function remapLoopNotesToPitchLines(
  notes: LoopNoteEvent[],
  pitchLines: LoopPitchLine[],
  state?: Pick<LoopComposerState, 'stepsPerBar' | 'beatsPerBar' | 'bars'>,
) {
  if (pitchLines.length === 0) return [];
  const maxIndex = pitchLines.length - 1;
  const pitchSteps = derivePitchStepsFromLines(pitchLines, pitchLines[0]?.hz ?? 220);
  const tempState = {
    pitchLines,
    pitchSteps,
    stepsPerBar: state?.stepsPerBar ?? 16,
    beatsPerBar: state?.beatsPerBar ?? 4,
    bars: state?.bars ?? 4,
  };
  return notes.map((note) => {
    const idx = parseLoopLineIndex(note.lineId);
    const fallbackIdx = Number.isFinite(note.channelIndex) ? note.channelIndex : parseLoopPitchIndex(note.stepId);
    const safeIndex = Math.max(0, Math.min(maxIndex, idx >= 0 ? idx : (fallbackIdx >= 0 ? fallbackIdx : 0)));
    return hydrateLoopNoteEvent(tempState, {
      ...note,
      channelIndex: safeIndex,
      lineId: pitchLines[safeIndex]?.id ?? `line-${safeIndex}`,
    });
  });
}

export function loopUnitToLabel(state: Pick<LoopComposerState, 'stepsPerBar' | 'beatsPerBar'>, unit: number) {
  return patternUnitToLabel(state, unit);
}

export function composerChannelCount(state: Pick<LoopComposerState, 'pitchSteps' | 'pitchLines'>) {
  return Math.max(1, state.pitchLines?.length || state.pitchSteps.length);
}

export function loopLineBaseLabel(line: LoopPitchLine) {
  return line.label.replace(/\s*\([^)]*Hz\)\s*$/i, '').trim();
}

export function loopLineDisplayLabel(line: LoopPitchLine) {
  return `${loopLineBaseLabel(line)} (${effectiveLoopLineHz(line).toFixed(1)}Hz)`;
}


export function isLoopInternalBarTimeGuideMarker(
  state: Pick<LoopComposerState, 'bars' | 'beatsPerBar'>,
  marker: Pick<LoopTimeGuideMarker, 'beat' | 'kind'>,
) {
  if (marker.kind !== 'bar') return false;
  const beatsPerBar = Math.max(1, state.beatsPerBar || 4);
  const totalBeats = Math.max(1, state.bars) * beatsPerBar;
  return marker.beat > 0.001 && marker.beat < totalBeats - 0.001;
}

export function isLoopEditableFragmentCutMarker(
  state: Pick<LoopComposerState, 'bars' | 'beatsPerBar'>,
  marker: Pick<LoopTimeGuideMarker, 'beat' | 'kind'>,
) {
  return marker.kind === 'guide' || isLoopInternalBarTimeGuideMarker(state, marker);
}

export function isLoopActiveFragmentCutMarker(
  state: Pick<LoopComposerState, 'bars' | 'beatsPerBar'>,
  marker: Pick<LoopTimeGuideMarker, 'beat' | 'kind' | 'muted'>,
) {
  return marker.muted !== true && isLoopEditableFragmentCutMarker(state, marker);
}

export function getLoopTimeGuides(state: Pick<LoopComposerState, 'timeGuideMarkers' | 'bars' | 'beatsPerBar' | 'segmentCount'>) {
  return state.timeGuideMarkers?.length
    ? state.timeGuideMarkers
    : createDefaultLoopTimeGuides(state.bars, state.beatsPerBar || 4, inferLoopSegmentCount(state));
}
