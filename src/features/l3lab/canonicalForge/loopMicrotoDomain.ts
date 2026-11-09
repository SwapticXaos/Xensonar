import type { CanonicalLoopComposerTuning } from './sessionTypes';
import type { MicrotoMelodicLoopSeedExport } from '../../../external/microto/integrations/xensonar/types';
import { clampBars } from '../spectralForge/state/storeMaterialExport';
import {
  composerChannelCount,
  createDefaultLoopTimeGuides,
  getDefaultRepetitionModelForTuning,
  inferLoopSegmentCount,
  syncLoopNoteToState,
  totalLoopUnits,
} from './loopGridKernel';
import type { LoopComposerState, LoopNoteEvent } from './loopDrumDomainTypes';
import { makeLoopNote } from './loopCompositionDomain';
import { rebuildLoopComposerPitchField } from './loopPitchDomain';

export type LoopMicrotoHost = {
  createEmptyLoopComposer: (bars?: number) => LoopComposerState;
  cloneLoopComposerState: (state: LoopComposerState) => LoopComposerState;
};

export function mapMicrotoTuningToCanonical(tuning: MicrotoMelodicLoopSeedExport['tuningMode']): CanonicalLoopComposerTuning {
  if (tuning === '12edo' || tuning === '19edo' || tuning === '22edo' || tuning === 'ji' || tuning === 'bp') return tuning;
  return 'ji';
}

export function trackIdForMicrotoMovementKind(kind: MicrotoMelodicLoopSeedExport['movementEvents'][number]['kind']) {
  if (kind === 'step' || kind === 'land' || kind === 'checkpoint' || kind === 'fall') return 'bass';
  if (kind === 'jump' || kind === 'coin' || kind === 'motion' || kind === 'turn' || kind === 'mode_shift') return 'companion';
  return 'aux';
}

export function velocityForMicrotoMovement(event: MicrotoMelodicLoopSeedExport['movementEvents'][number]) {
  return Math.max(0.25, Math.min(1, 0.42 + event.energy * 0.5 + (event.airborne ? 0.08 : 0)));
}

export function durationUnitsForMicrotoMovement(event: MicrotoMelodicLoopSeedExport['movementEvents'][number]) {
  const special = event.kind === 'checkpoint' || event.kind === 'gate_unlock' || event.kind === 'sync_gate' || event.kind === 'phase_gate' || event.kind === 'tuning_crystal';
  const short = event.kind === 'step' || event.kind === 'turn' || event.kind === 'coin';
  const base = special ? 5 : (event.airborne ? 3 : (short ? 1.5 : 2.5));
  return Math.max(1, Math.min(8, base + event.energy * 2.5));
}

export function lineIndexFromMicrotoSemi(lineCount: number, semi: number) {
  if (lineCount <= 1) return 0;
  const normalized = Math.max(0, Math.min(1, (semi + 24) / 60));
  return Math.max(0, Math.min(lineCount - 1, Math.round((1 - normalized) * (lineCount - 1))));
}

export function buildLoopComposerFromMicrotoSeedOwned(
  seed: MicrotoMelodicLoopSeedExport,
  host: LoopMicrotoHost,
): LoopComposerState {
  const bars = clampBars(seed.bars || 4);
  const tuning = mapMicrotoTuningToCanonical(seed.tuningMode);
  const baseHz = Math.max(30, Math.min(1200, Number.isFinite(seed.rootHz) ? Number(seed.rootHz) : 220));
  const fallbackPhrase = seed.fallbackPhrase.length ? seed.fallbackPhrase : [0, 3, 7, 10];
  const draft = host.createEmptyLoopComposer(bars);
  draft.tuning = tuning;
  draft.repetitionModel = getDefaultRepetitionModelForTuning(tuning);
  draft.baseHz = baseHz;
  const rebuilt = rebuildLoopComposerPitchField(draft);
  draft.pitchLines = rebuilt.nextPitchLines;
  draft.pitchSteps = rebuilt.nextPitchSteps;
  draft.notes = [];
  draft.selectedNoteId = null;
  draft.selectedTrackId = 'bass';
  draft.compositionPresetId = tuning === 'maqam' ? 'oriental' : tuning === 'ji' ? 'classical' : 'jazz';
  draft.bars = bars;
  draft.beatsPerBar = 4;
  draft.stepsPerBar = 16;
  draft.segmentCount = inferLoopSegmentCount(draft);
  draft.timeGuideMarkers = createDefaultLoopTimeGuides(bars, draft.beatsPerBar, draft.segmentCount);
  draft.zoom = 1.08;
  draft.scrollX = 0;
  draft.zoomY = 1;
  draft.scrollY = 0;
  draft.activeTrackIds = ['bass', 'companion', 'aux'];
  draft.tracks = draft.tracks.map((track) => track.id === 'aux' ? { ...track, enabled: true } : { ...track, enabled: true });

  const lineCount = composerChannelCount(draft);
  const totalUnits = totalLoopUnits(draft);
  const anchorSpacing = draft.stepsPerBar;

  for (let bar = 0; bar < bars; bar += 1) {
    const anchorSemi = fallbackPhrase[bar % fallbackPhrase.length] ?? 0;
    draft.notes.push(makeLoopNote(draft, {
      trackId: 'bass',
      channelIndex: lineIndexFromMicrotoSemi(lineCount, anchorSemi - 12),
      startUnit: bar * anchorSpacing,
      durationUnits: 4,
      velocity: 0.68,
      fadeOutUnits: 0.4,
    }));
    const companionStart = bar * anchorSpacing + Math.min(6, Math.max(2, Math.round(2 + seed.evolutionDepth * 3)));
    if (companionStart < totalUnits) {
      draft.notes.push(makeLoopNote(draft, {
        trackId: 'companion',
        channelIndex: lineIndexFromMicrotoSemi(lineCount, anchorSemi + 5 + ((bar % 2) * 2)),
        startUnit: companionStart,
        durationUnits: 2.5,
        velocity: 0.58,
        fadeOutUnits: 0.35,
      }));
    }
  }

  const sortedEvents = [...seed.movementEvents].sort((a, b) => (a.t - b.t) || ((a.ordinal ?? 0) - (b.ordinal ?? 0)));
  const sampleStride = Math.max(1, Math.ceil(sortedEvents.length / Math.max(18, bars * 8)));
  const sampledEvents = sortedEvents.filter((_, index) => index % sampleStride === 0);
  const minT = sampledEvents[0]?.t ?? 0;
  const maxT = sampledEvents[sampledEvents.length - 1]?.t ?? minT + 1;
  const span = Math.max(0.001, maxT - minT);

  sampledEvents.forEach((event, index) => {
    const startUnit = Math.max(0, Math.min(totalUnits - 1, Math.round(((event.t - minT) / span) * Math.max(1, totalUnits - 1))));
    const phraseSemi = fallbackPhrase[index % fallbackPhrase.length] ?? 0;
    const combinedSemi = event.semi * 0.75 + phraseSemi * 0.45 + (event.lane - 1.5) * 2.2;
    const note = makeLoopNote(draft, {
      trackId: trackIdForMicrotoMovementKind(event.kind),
      channelIndex: lineIndexFromMicrotoSemi(lineCount, combinedSemi),
      startUnit,
      durationUnits: durationUnitsForMicrotoMovement(event),
      velocity: velocityForMicrotoMovement(event),
      fadeOutUnits: event.airborne ? 0.7 : 0.3,
    });
    draft.notes.push(note);
  });

  const deduped = new Map<string, LoopNoteEvent>();
  draft.notes
    .sort((a, b) => (a.startUnit - b.startUnit) || (a.channelIndex - b.channelIndex) || a.trackId.localeCompare(b.trackId))
    .forEach((note) => {
      const key = `${note.trackId}:${Math.round(note.startUnit)}:${note.channelIndex}`;
      if (!deduped.has(key)) deduped.set(key, note);
    });
  draft.notes = [...deduped.values()].slice(0, 96).map((note) => syncLoopNoteToState(draft, note));
  draft.selectedNoteId = draft.notes[0]?.id ?? null;
  draft.selectedTrackId = draft.notes[0]?.trackId ?? 'bass';
  return host.cloneLoopComposerState(draft);
}

