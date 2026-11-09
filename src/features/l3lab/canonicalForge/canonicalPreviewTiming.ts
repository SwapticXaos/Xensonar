import type {
  CanonicalLoopComposerRepetitionModel,
  CanonicalLoopComposerState,
  CanonicalLoopNoteEvent,
} from './sessionTypes';
import type { PreviewRequest, ResolvedInstrumentDef } from './canonicalPreviewContracts';
import { canonicalLoopNoteOctaveOffset } from './loopGridKernel';

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function totalComposerSteps(state: CanonicalLoopComposerState) {
  return Math.max(1, state.stepsPerBar * Math.max(1, state.bars));
}

export function loopUnitsPerBeat(state: CanonicalLoopComposerState) {
  return Math.max(0.25, Math.max(1, state.stepsPerBar) / Math.max(1, state.beatsPerBar || 4));
}

export function repetitionRatio(model: CanonicalLoopComposerRepetitionModel | undefined) {
  return model === 'tritave' ? 3 : 2;
}

export function previewSecondsPerBar(request: PreviewRequest) {
  const beatsPerBar = Math.max(1, request.composer.beatsPerBar || 4);
  return (beatsPerBar * 60) / Math.max(40, request.bpm);
}

export function previewComposerDurationSec(request: PreviewRequest) {
  return Math.max(0.25, Math.max(1, request.composer.bars || 1) * previewSecondsPerBar(request));
}

export function previewHasDrums(request: PreviewRequest) {
  return Boolean(request.customDrumPattern?.useCustom || (request.drumPattern && request.drumKit));
}

export function previewDrumBars(request: PreviewRequest) {
  if (request.customDrumPattern?.bars) return Math.max(1, request.customDrumPattern.bars);
  return Math.max(1, request.bars || request.composer.bars || 1);
}

export function previewDrumDurationSec(request: PreviewRequest) {
  if (!previewHasDrums(request)) return 0;
  return Math.max(0.25, previewDrumBars(request) * previewSecondsPerBar(request));
}

export function previewTotalDurationSec(request: PreviewRequest) {
  const noteOrTrackDuration = (request.noteId || request.trackIds.length) ? previewComposerDurationSec(request) : 0;
  const drumDuration = previewDrumDurationSec(request);
  const fallbackDuration = Math.max(0.25, Math.max(1, request.bars || request.composer.bars || 1) * previewSecondsPerBar(request));
  return Math.max(noteOrTrackDuration, drumDuration, fallbackDuration);
}

export function noteChannelIndex(state: CanonicalLoopComposerState, note: CanonicalLoopNoteEvent) {
  const lineId = (note as { lineId?: unknown }).lineId;
  const lineMatch = typeof lineId === 'string' ? /line-(\d+)/.exec(lineId) : null;
  if (lineMatch) return Math.max(0, Math.min((state.pitchLines?.length || state.pitchSteps.length) - 1, Number(lineMatch[1])));
  if (Number.isFinite((note as { channelIndex?: number }).channelIndex)) {
    return Math.max(0, Math.min((state.pitchLines?.length || state.pitchSteps.length) - 1, (note as { channelIndex: number }).channelIndex));
  }
  const stepId = (note as { stepId?: unknown }).stepId;
  const match = typeof stepId === 'string' ? /step-(\d+)/.exec(stepId) : null;
  const idx = match ? Number(match[1]) : 0;
  return Math.max(0, Math.min((state.pitchLines?.length || state.pitchSteps.length) - 1, idx));
}

export function noteStartUnit(state: CanonicalLoopComposerState, note: CanonicalLoopNoteEvent) {
  const startBeat = (note as { startBeat?: number }).startBeat;
  const fromBeat = Number.isFinite(startBeat) ? Math.max(0, Number(startBeat)) * loopUnitsPerBeat(state) : null;
  return fromBeat ?? (Number.isFinite((note as { startUnit?: number }).startUnit)
    ? Math.max(0, (note as { startUnit: number }).startUnit)
    : Math.max(0, (note as { startStep?: number }).startStep ?? 0));
}

export function noteDurationUnits(state: CanonicalLoopComposerState, note: CanonicalLoopNoteEvent) {
  const startBeat = (note as { startBeat?: number }).startBeat;
  const endBeat = (note as { endBeat?: number }).endBeat;
  const fromBeat = Number.isFinite(startBeat) && Number.isFinite(endBeat)
    ? Math.max(0.125, (Number(endBeat) - Number(startBeat)) * loopUnitsPerBeat(state))
    : null;
  return fromBeat ?? (Number.isFinite((note as { durationUnits?: number }).durationUnits)
    ? Math.max(0.125, (note as { durationUnits: number }).durationUnits)
    : Math.max(0.125, (note as { lengthSteps?: number }).lengthSteps ?? 1));
}

export function noteFadeInUnits(note: CanonicalLoopNoteEvent) {
  return Number.isFinite((note as { fadeInUnits?: number }).fadeInUnits)
    ? Math.max(0, (note as { fadeInUnits: number }).fadeInUnits)
    : Math.max(0, (note as { fadeInSteps?: number }).fadeInSteps ?? 0);
}

export function noteFadeOutUnits(note: CanonicalLoopNoteEvent) {
  return Number.isFinite((note as { fadeOutUnits?: number }).fadeOutUnits)
    ? Math.max(0, (note as { fadeOutUnits: number }).fadeOutUnits)
    : Math.max(0, (note as { fadeOutSteps?: number }).fadeOutSteps ?? 0);
}

export function ratioFrequency(state: CanonicalLoopComposerState, note: CanonicalLoopNoteEvent, resolvedInstrument: ResolvedInstrumentDef) {
  const channelIndex = noteChannelIndex(state, note);
  const line = state.pitchLines?.[channelIndex];
  const step = state.pitchSteps[channelIndex] ?? state.pitchSteps[0];
  const baseHz = Math.max(30, Math.min(1200, Number.isFinite(state.baseHz) ? state.baseHz : 220));
  const lineHz = line?.hz ?? (baseHz * (step?.ratio ?? 1));
  const cents = ((line?.offsetCents ?? step?.offsetCents ?? 0)) / 1200;
  const octaveBias = resolvedInstrument.kind === 'synth' ? (resolvedInstrument.voice.octaveBias ?? 0) : 0;
  const octave = canonicalLoopNoteOctaveOffset(note) + octaveBias;
  return lineHz * Math.pow(repetitionRatio(state.repetitionModel), octave) * Math.pow(2, cents);
}

export function clampPlaybackRatio(value: number, min = 0, max = 1) {
  return clamp(value, min, max);
}
