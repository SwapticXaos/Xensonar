import { compileRootFollowCarrierField } from '../../xensonar/rootFollow/rootFollowCarrierCompiler';
import {
  canonicalLoopNoteOctaveOffset,
  cloneLoopComposerState,
  type LoopComposerState,
} from './loopDrumDomain';
import {
  effectiveLoopLineHz,
  loopUnitsPerBeat,
  noteChannelIndex,
  noteDurationUnits,
  noteFadeInUnits,
  noteFadeOutUnits,
  noteStartUnit,
  resolveLoopNoteRenderSourceKind,
} from './loopGridKernel';
import { ensureLocalFieldState } from './localField';
import type { RootFollowBankEntryConfig } from '../../xensonar/rootFollow/rootFollowTypes';

function findNearestAnchorGridStep(state: LoopComposerState) {
  if (!state.pitchLines.length) return 0;
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  state.pitchLines.forEach((line, index) => {
    const distance = Math.abs(effectiveLoopLineHz(line) - state.baseHz);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });
  return bestIndex;
}

export function buildSynthRootFollowEntryConfig(args: {
  loopComposer: LoopComposerState;
}): RootFollowBankEntryConfig {
  const composer = cloneLoopComposerState(args.loopComposer);
  const unitsPerBeat = loopUnitsPerBeat(composer);
  const anchorGridStep = findNearestAnchorGridStep(composer);

  return {
    sourceKind: 'synth',
    renderMode: 'direct',
    anchorGridStep,
    formantWindowPlan: null,
    synthPattern: {
      bars: Math.max(1, composer.bars),
      beatsPerBar: Math.max(1, composer.beatsPerBar || 4),
      stepsPerBar: Math.max(1, composer.stepsPerBar),
      segmentCount: Math.max(1, composer.segmentCount || 1),
      baseHz: Math.max(1, composer.baseHz || 220),
      tuning: composer.tuning || '12edo',
      repetitionModel: composer.repetitionModel || 'octave',
      activeTrackIds: [...composer.activeTrackIds],
      tracks: composer.tracks.map((track) => ({
        id: track.id,
        label: track.label,
        color: track.color,
        instrumentRole: track.instrumentRole,
        instrumentPreset: track.instrumentPreset ?? null,
        patternPresetId: track.patternPresetId ?? null,
        enabled: track.enabled !== false,
        volume: Number.isFinite(track.volume) ? track.volume : 0.8,
        pan: Number.isFinite(track.pan ?? NaN) ? Number(track.pan) : 0,
      })),
      notes: composer.notes.flatMap((note) => {
        const channelIndex = noteChannelIndex(composer, note);
        const line = composer.pitchLines[channelIndex] ?? null;
        const snapshot = {
          carrierIntegralTimbre: note.carrierIntegralTimbre ?? null,
          materialPitchMode: note.materialPitchMode ?? null,
          id: note.id,
          trackId: note.trackId,
          startBeat: noteStartUnit(composer, note) / unitsPerBeat,
          durationBeats: noteDurationUnits(composer, note) / unitsPerBeat,
          gridStepOffset: channelIndex - anchorGridStep,
          channelIndex,
          octaveOffset: canonicalLoopNoteOctaveOffset(note),
          velocity: Number.isFinite(note.velocity) ? note.velocity : 0.8,
          gate: 1,
          lineId: typeof note.lineId === 'string' ? note.lineId : null,
          lineHz: line ? effectiveLoopLineHz(line) : null,
          instrumentPresetOverride: note.instrumentPresetOverride ?? null,
          noteClass: note.noteClass ?? 'standard',
          renderSourceKind: resolveLoopNoteRenderSourceKind(composer, note),
          sourceMaterialId: typeof note.sourceMaterialId === 'string' ? note.sourceMaterialId : null,
          anchorHz: Number.isFinite(note.anchorHz ?? NaN) ? Math.max(1, Number(note.anchorHz)) : null,
          sourceTempoBpm: Number.isFinite(note.sourceTempoBpm ?? NaN) ? Math.max(1, Number(note.sourceTempoBpm)) : null,
          sourceLoopDurationSec: Number.isFinite(note.sourceLoopDurationSec ?? NaN) ? Math.max(0.005, Number(note.sourceLoopDurationSec)) : null,
          sampleOffsetSec: Number.isFinite(note.sampleOffsetSec ?? NaN) ? Math.max(0, Number(note.sampleOffsetSec)) : null,
          samplePlaybackDurationSec: Number.isFinite(note.samplePlaybackDurationSec ?? NaN) ? Math.max(0.005, Number(note.samplePlaybackDurationSec)) : null,
          fadeInBeats: noteFadeInUnits(note) / unitsPerBeat,
          fadeOutBeats: noteFadeOutUnits(note) / unitsPerBeat,
          localField: note.localField ? ensureLocalFieldState(note.localField) : null,
        };
        return compileRootFollowCarrierField(snapshot, note.carrierIntegralField, composer.baseHz);
      }),
    },
    synthPatch: {
      compositionPresetId: composer.compositionPresetId || 'jazz',
      baseHz: Math.max(1, composer.baseHz || 220),
      tuning: composer.tuning || '12edo',
      repetitionModel: composer.repetitionModel || 'octave',
      carrierIntegralTimbre: null,
      trackPatches: composer.tracks.map((track) => ({
        id: track.id,
        instrumentPreset: track.instrumentPreset ?? null,
        patternPresetId: track.patternPresetId ?? null,
        enabled: track.enabled !== false,
        volume: Number.isFinite(track.volume) ? track.volume : 0.8,
        pan: Number.isFinite(track.pan ?? NaN) ? Number(track.pan) : 0,
      })),
    },
  };
}
