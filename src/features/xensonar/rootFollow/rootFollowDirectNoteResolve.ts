import type {
  InstrumentVoiceDef,
  SamplePlaybackDef,
} from '../../l3lab/canonicalForge/canonicalPreviewContracts';
import { resolveInstrumentDef } from '../../l3lab/canonicalForge/canonicalPreviewVoices';
import { getPreparedRootFollowSample } from './rootFollowSamplePreparation';
import { clamp } from '../rooms/resonanceRuntimeMath';
import {
  inferRootFollowSynthRenderSourceKind,
  rootFollowRenderSourceUsesAudioElasticity,
  type RootFollowCarrierTimbreSnapshot,
  type RootFollowSynthNoteClass,
  type RootFollowSynthRenderSourceKind,
} from './rootFollowTypes';
import {
  resolveRootFollowDirectTrafficSmoothing,
  type RootFollowDirectTrafficProfile,
} from './rootFollowDirectEventWindow';

export type RootFollowDirectNoteResolveArgs = {
  ctx: AudioContext;
  sampleOwner?: object;
  noteId: string;
  noteStart: number;
  noteDuration: number;
  velocity: number;
  trackVolume: number;
  presetId: string | null;
  noteClass?: RootFollowSynthNoteClass;
  renderSourceKind?: RootFollowSynthRenderSourceKind | null;
  trafficProfile?: RootFollowDirectTrafficProfile | null;
  carrierIntegralTimbre?: RootFollowCarrierTimbreSnapshot | null;
};

export type RootFollowResolvedSampleDirectNote = {
  kind: 'sample';
  resolved: SamplePlaybackDef;
  noteStart: number;
  noteDuration: number;
  resolvedRenderSourceKind: RootFollowSynthRenderSourceKind;
  audioElasticEvent: boolean;
};

export type RootFollowResolvedOscillatorDirectNote = {
  kind: 'oscillator';
  preset: InstrumentVoiceDef;
  voiceId: string;
  noteStart: number;
  noteDuration: number;
  attack: number;
  release: number;
  peak: number;
  resolvedRenderSourceKind: RootFollowSynthRenderSourceKind;
  audioElasticEvent: boolean;
};

export type RootFollowResolvedDirectNote =
  | RootFollowResolvedSampleDirectNote
  | RootFollowResolvedOscillatorDirectNote;

function applyCarrierIntegralTimbreSnapshot(
  voice: InstrumentVoiceDef,
  timbre: RootFollowCarrierTimbreSnapshot | null | undefined,
): InstrumentVoiceDef {
  if (!timbre || !timbre.oscillators.length) return voice;
  const driveScale = 1 + clamp(timbre.drive, 0, 1) * 0.28;
  return {
    ...voice,
    oscillators: timbre.oscillators.map((osc) => ({
      type: osc.type,
      gain: clamp(osc.gain * driveScale, 0.01, 0.48),
      freqMul: clamp(osc.freqMul, 0.125, 8),
      detune: clamp(osc.detune, -1200, 1200),
    })),
    filterType: timbre.filterType,
    filterFrequency: clamp(timbre.filterFrequency, 160, 7200),
    filterQ: clamp(timbre.filterQ, 0.1, 8),
    attackScale: clamp(timbre.attackScale, 0.005, 0.6),
    releaseScale: clamp(timbre.releaseScale, 0.04, 1.4),
    transientGain: clamp(timbre.transientGain, 0, 0.45),
    panSpread: clamp(timbre.panSpread, 0, 0.65),
  };
}

function makeVoiceId(noteId: string, startTime: number) {
  return `${noteId}@${Math.round(startTime * 1000)}`;
}

function resolveRootFollowDirectInstrumentDef(args: {
  ctx: AudioContext;
  sampleOwner?: object;
  presetId: string | null;
  allowSamplePreset?: boolean;
}) {
  const { ctx, presetId, allowSamplePreset = true } = args;
  if (
    allowSamplePreset &&
    typeof presetId === 'string' &&
    presetId.startsWith('sample:')
  ) {
    const sampleId = presetId.slice('sample:'.length).trim();
    if (sampleId) {
      const sampleDef = getPreparedRootFollowSample(ctx, sampleId, args.sampleOwner);
      if (sampleDef) return sampleDef;
    }
  }
  if (allowSamplePreset && presetId?.startsWith('sample:')) return null;
  return resolveInstrumentDef(presetId ?? undefined, new Map());
}

export function resolveRootFollowDirectNoteRenderPlan(
  args: RootFollowDirectNoteResolveArgs,
): RootFollowResolvedDirectNote | null {
  const {
    ctx,
    noteId,
    noteStart,
    noteDuration,
    velocity,
    trackVolume,
    presetId,
    noteClass = 'standard',
    renderSourceKind: requestedRenderSourceKind = null,
    trafficProfile = null,
    carrierIntegralTimbre = null,
  } = args;

  const trafficSmoothing = resolveRootFollowDirectTrafficSmoothing(
    trafficProfile,
    noteDuration,
  );
  const effectiveNoteStart = noteStart + trafficSmoothing.startOffsetSec;
  const effectiveNoteDuration = Math.max(
    0.04,
    noteDuration - trafficSmoothing.startOffsetSec,
  );
  const resolvedRenderSourceKind = inferRootFollowSynthRenderSourceKind({
    renderSourceKind: requestedRenderSourceKind,
    noteClass,
    presetId,
  });
  const audioElasticEvent = rootFollowRenderSourceUsesAudioElasticity(
    resolvedRenderSourceKind,
  );
  const resolved = resolveRootFollowDirectInstrumentDef({
    ctx,
    presetId,
    allowSamplePreset: audioElasticEvent,
    sampleOwner: args.sampleOwner,
  });

  if (!resolved) return null;
  if (resolved.kind === 'sample') {
    return {
      kind: 'sample',
      resolved,
      noteStart: effectiveNoteStart,
      noteDuration: effectiveNoteDuration,
      resolvedRenderSourceKind,
      audioElasticEvent,
    };
  }

  const preset = applyCarrierIntegralTimbreSnapshot(
    resolved.voice,
    carrierIntegralTimbre,
  );
  const attack = Math.min(
    effectiveNoteDuration * 0.8,
    Math.max(
      trafficSmoothing.minAttackSec,
      effectiveNoteDuration * (preset.attackScale ?? 0.03),
    ),
  );
  const release = Math.min(
    effectiveNoteDuration * 0.8,
    Math.max(
      trafficSmoothing.minReleaseSec,
      effectiveNoteDuration * (preset.releaseScale ?? 0.18),
    ),
  );
  const peak = Math.max(
    0.001,
    velocity * trackVolume * 0.42 * trafficSmoothing.peakScale,
  );

  return {
    kind: 'oscillator',
    preset,
    voiceId: makeVoiceId(noteId, effectiveNoteStart),
    noteStart: effectiveNoteStart,
    noteDuration: effectiveNoteDuration,
    attack,
    release,
    peak,
    resolvedRenderSourceKind,
    audioElasticEvent,
  };
}

