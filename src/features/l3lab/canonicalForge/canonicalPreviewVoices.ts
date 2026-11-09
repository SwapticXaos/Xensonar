import { ensureLocalFieldState } from './localField';
import type { CanonicalLoopNoteEvent, CanonicalLoopTrack } from './sessionTypes';
import {
  resolveMelodicSoundEntry,
  type LoopTrackInstrumentPreset,
} from './melodicSoundRegistry';
import { loadMelodicSampleBuffer } from './melodicSampleLibrary';
import type {
  InstrumentVoiceDef,
  PreviewRequest,
  ResolvedInstrumentDef,
  SamplePlaybackDef,
} from './canonicalPreviewContracts';
import { BASE_TONE_PLANS } from '@/external/microto/features/resonance/resonanceAgentTonePlans';
import { RESIDENT_SOUND_OPTIONS } from '@/features/topology/residentSoundCatalog';
import {
  PRESET_MAP as DRONE_PRESET_MAP,
  type DronePreset,
  type WaveSoundPreset,
} from '../../xensonar/domain/instrumentData';

export { LOOP_TRACK_INSTRUMENTS } from './melodicSoundRegistry';
export type { LoopTrackInstrumentPreset } from './melodicSoundRegistry';

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function resolveEffectiveInstrumentPresetId(track: CanonicalLoopTrack, note?: CanonicalLoopNoteEvent | null) {
  const override = typeof (note as { instrumentPresetOverride?: unknown } | null | undefined)?.instrumentPresetOverride === 'string'
    ? String((note as { instrumentPresetOverride?: string }).instrumentPresetOverride)
    : null;
  return override && override.trim() ? override : track.instrumentPreset;
}

export async function loadSamplePlaybackMap(request: PreviewRequest, ctx: BaseAudioContext) {
  const presetIds = new Set<string>();
  request.composer.tracks.forEach((track) => {
    const relevantNotes = request.composer.notes.filter((note) => note.trackId === track.id);
    if (request.trackIds.includes(track.id) || relevantNotes.length > 0) {
      const trackPreset = typeof track.instrumentPreset === 'string' && track.instrumentPreset.startsWith('sample:') ? track.instrumentPreset : null;
      if (trackPreset) presetIds.add(trackPreset);
      relevantNotes.forEach((note) => {
        const preset = resolveEffectiveInstrumentPresetId(track, note);
        if (typeof preset === 'string' && preset.startsWith('sample:')) presetIds.add(preset);
      });
    }
  });
  const sampleEntries = await Promise.all(Array.from(presetIds).map(async (presetId) => {
    const sampleId = presetId.slice('sample:'.length);
    const loaded = await loadMelodicSampleBuffer(sampleId, ctx);
    if (!loaded) return null;
    return [
      presetId,
      {
        kind: 'sample' as const,
        sampleId,
        baseHz: loaded.baseHz,
        baseHzSource: loaded.baseHzSource,
        tempoPitchLinked: loaded.tempoPitchLinked,
        playbackDurationSec: loaded.playbackDurationSec,
        volumeEnvelope: loaded.volumeEnvelope ? ensureLocalFieldState(loaded.volumeEnvelope) : null,
        pitchEnvelope: loaded.pitchEnvelope ? ensureLocalFieldState(loaded.pitchEnvelope) : null,
        buffer: loaded.buffer,
      },
    ];
  }));
  return new Map(sampleEntries.filter(Boolean) as Array<[string, SamplePlaybackDef]>);
}

type TonePlanPart = {
  freqMul: number;
  offsetSeconds?: number;
  durationSeconds?: number;
  type: OscillatorType;
  volumeMul: number;
  q?: number;
  cutoff?: number;
};

const PARTICLE_TONE_PLANS: Record<string, TonePlanPart[]> = {
  ...BASE_TONE_PLANS,
  velvet_bloom: [
    { freqMul: 1, offsetSeconds: 0, durationSeconds: 1.1, type: 'triangle', volumeMul: 1, q: 1.1, cutoff: 1500 },
    { freqMul: 1.45, offsetSeconds: 0.05, durationSeconds: 0.88, type: 'sine', volumeMul: 0.38, q: 1, cutoff: 1900 },
    { freqMul: 2.04, offsetSeconds: 0.1, durationSeconds: 0.56, type: 'sine', volumeMul: 0.2, q: 1, cutoff: 2400 },
  ],
  shimmer_pad: [
    { freqMul: 1, offsetSeconds: 0, durationSeconds: 1.4, type: 'sine', volumeMul: 1, q: 1, cutoff: 1400 },
    { freqMul: 2.01, offsetSeconds: 0.06, durationSeconds: 1.0, type: 'triangle', volumeMul: 0.3, q: 1, cutoff: 2200 },
    { freqMul: 3.02, offsetSeconds: 0.12, durationSeconds: 0.72, type: 'sine', volumeMul: 0.18, q: 1, cutoff: 3000 },
  ],
  dust_chime: [
    { freqMul: 1, offsetSeconds: 0, durationSeconds: 0.18, type: 'sine', volumeMul: 0.76, q: 2.8, cutoff: 3200 },
    { freqMul: 2.62, offsetSeconds: 0.008, durationSeconds: 0.12, type: 'triangle', volumeMul: 0.22, q: 1.8, cutoff: 4200 },
    { freqMul: 3.92, offsetSeconds: 0.016, durationSeconds: 0.09, type: 'sine', volumeMul: 0.12, q: 1.4, cutoff: 5200 },
  ],
  rubber_click: [
    { freqMul: 0.84, offsetSeconds: 0, durationSeconds: 0.08, type: 'triangle', volumeMul: 1, q: 1.2, cutoff: 1100 },
    { freqMul: 0.52, offsetSeconds: 0.004, durationSeconds: 0.05, type: 'sine', volumeMul: 0.24, q: 1, cutoff: 620 },
  ],
  reed_pop: [
    { freqMul: 1, offsetSeconds: 0, durationSeconds: 0.16, type: 'square', volumeMul: 0.84, q: 2.2, cutoff: 1600 },
    { freqMul: 1.46, offsetSeconds: 0.008, durationSeconds: 0.11, type: 'triangle', volumeMul: 0.24, q: 2.8, cutoff: 2400 },
  ],
  granular_spark: [
    { freqMul: 1, offsetSeconds: 0, durationSeconds: 0.08, type: 'triangle', volumeMul: 0.62, q: 3.2, cutoff: 2600 },
    { freqMul: 2.22, offsetSeconds: 0.003, durationSeconds: 0.06, type: 'sine', volumeMul: 0.2, q: 2.4, cutoff: 4200 },
    { freqMul: 3.36, offsetSeconds: 0.01, durationSeconds: 0.05, type: 'sine', volumeMul: 0.12, q: 1.8, cutoff: 5200 },
  ],
};

function buildTonePlanVoice(plan: TonePlanPart[], options?: Partial<Omit<InstrumentVoiceDef, 'oscillators'>>) {
  const usable = plan.slice(0, 4);
  const maxDuration = Math.max(0.08, ...usable.map((part) => part.durationSeconds ?? 0.18));
  const weightedCutoff = usable.reduce((sum, part) => sum + (part.cutoff ?? 1600) * part.volumeMul, 0) / Math.max(0.001, usable.reduce((sum, part) => sum + part.volumeMul, 0));
  const weightedQ = usable.reduce((sum, part) => sum + (part.q ?? 1) * part.volumeMul, 0) / Math.max(0.001, usable.reduce((sum, part) => sum + part.volumeMul, 0));
  return {
    oscillators: usable.map((part) => ({
      type: part.type,
      gain: clamp(0.14 * part.volumeMul, 0.04, 0.34),
      freqMul: part.freqMul,
      startOffsetSec: part.offsetSeconds ?? 0,
      durationMul: clamp((part.durationSeconds ?? maxDuration) / maxDuration, 0.18, 1.2),
    })),
    filterType: weightedCutoff >= 2200 ? 'bandpass' : weightedCutoff <= 900 ? 'lowpass' : 'highpass',
    filterFrequency: clamp(weightedCutoff, 420, 5200),
    filterQ: clamp(weightedQ, 0.5, 4.5),
    attackScale: options?.attackScale ?? 0.03,
    releaseScale: options?.releaseScale ?? clamp(maxDuration * 0.55, 0.14, 0.9),
    transientGain: options?.transientGain ?? 0.12,
    panSpread: options?.panSpread ?? 0.18,
    octaveBias: options?.octaveBias,
  } satisfies InstrumentVoiceDef;
}

function buildWavePresetVoice(preset: WaveSoundPreset): InstrumentVoiceDef {
  switch (preset) {
    case 'glass_ping':
      return buildTonePlanVoice([
        { freqMul: 1, type: 'triangle', volumeMul: 1, durationSeconds: 0.42, cutoff: 1800, q: 2 },
        { freqMul: 2, type: 'sine', volumeMul: 0.36, durationSeconds: 0.28, offsetSeconds: 0.02, cutoff: 2600, q: 1.1 },
      ], { attackScale: 0.015, releaseScale: 0.32, transientGain: 0.18, panSpread: 0.2 });
    case 'soft_pluck':
      return buildTonePlanVoice([{ freqMul: 1, type: 'sine', volumeMul: 1, durationSeconds: 0.28, cutoff: 1200, q: 1.2 }], { attackScale: 0.015, releaseScale: 0.22, transientGain: 0.2, panSpread: 0.18 });
    case 'bell_tone':
      return buildTonePlanVoice([
        { freqMul: 1, type: 'sine', volumeMul: 1, durationSeconds: 0.5, cutoff: 2400, q: 1.1 },
        { freqMul: 2, type: 'triangle', volumeMul: 0.42, durationSeconds: 0.3, offsetSeconds: 0.02, cutoff: 3200, q: 1 },
      ], { attackScale: 0.012, releaseScale: 0.5, transientGain: 0.14, panSpread: 0.2 });
    case 'clean_pluck':
      return buildTonePlanVoice([{ freqMul: 1, type: 'sawtooth', volumeMul: 0.84, durationSeconds: 0.24, cutoff: 900, q: 2.6 }], { attackScale: 0.01, releaseScale: 0.18, transientGain: 0.2, panSpread: 0.14 });
    case 'deep_sub':
      return buildTonePlanVoice([
        { freqMul: 1, type: 'sine', volumeMul: 1, durationSeconds: 0.58, cutoff: 520, q: 1.2 },
        { freqMul: 2, type: 'triangle', volumeMul: 0.18, durationSeconds: 0.42, offsetSeconds: 0.03, cutoff: 760, q: 1 },
      ], { attackScale: 0.04, releaseScale: 0.42, transientGain: 0.08, panSpread: 0.08 });
    case 'vibrato_glass':
      return buildTonePlanVoice([
        { freqMul: 1, type: 'triangle', volumeMul: 0.82, durationSeconds: 0.54, cutoff: 2100, q: 1.6 },
        { freqMul: 2.01, type: 'sine', volumeMul: 0.3, durationSeconds: 0.42, offsetSeconds: 0.018, cutoff: 2600, q: 1.1 },
        { freqMul: 0.998, type: 'sine', volumeMul: 0.18, durationSeconds: 0.62, offsetSeconds: 0.028, cutoff: 1700, q: 1 },
      ], { attackScale: 0.08, releaseScale: 0.56, transientGain: 0.06, panSpread: 0.18 });
    case 'tape_halo':
      return buildTonePlanVoice([
        { freqMul: 1, type: 'triangle', volumeMul: 0.8, durationSeconds: 0.8, cutoff: 1400, q: 1.2 },
        { freqMul: 1.5, type: 'sine', volumeMul: 0.36, durationSeconds: 0.62, offsetSeconds: 0.03, cutoff: 1800, q: 1 },
        { freqMul: 0.5, type: 'sine', volumeMul: 0.22, durationSeconds: 0.7, offsetSeconds: 0.05, cutoff: 900, q: 0.8 },
      ], { attackScale: 0.18, releaseScale: 0.74, transientGain: 0.03, panSpread: 0.16 });
    case 'membrane_thump':
      return buildTonePlanVoice([
        { freqMul: 0.5, type: 'triangle', volumeMul: 1, durationSeconds: 0.22, cutoff: 560, q: 1.1 },
        { freqMul: 0.98, type: 'sine', volumeMul: 0.24, durationSeconds: 0.14, offsetSeconds: 0.01, cutoff: 760, q: 1 },
      ], { attackScale: 0.01, releaseScale: 0.16, transientGain: 0.22, panSpread: 0.1, octaveBias: -1 });
    case 'reed_sigh':
      return buildTonePlanVoice([
        { freqMul: 1, type: 'square', volumeMul: 0.84, durationSeconds: 0.3, cutoff: 1300, q: 2.4 },
        { freqMul: 1.5, type: 'triangle', volumeMul: 0.28, durationSeconds: 0.28, offsetSeconds: 0.018, cutoff: 1800, q: 2.8 },
      ], { attackScale: 0.02, releaseScale: 0.28, transientGain: 0.16, panSpread: 0.12 });
    case 'spark_chime':
      return buildTonePlanVoice([
        { freqMul: 1, type: 'sine', volumeMul: 0.76, durationSeconds: 0.16, cutoff: 3000, q: 3.4 },
        { freqMul: 2.48, type: 'triangle', volumeMul: 0.22, durationSeconds: 0.12, offsetSeconds: 0.01, cutoff: 4200, q: 2.2 },
        { freqMul: 3.72, type: 'sine', volumeMul: 0.14, durationSeconds: 0.1, offsetSeconds: 0.016, cutoff: 5200, q: 1.6 },
      ], { attackScale: 0.01, releaseScale: 0.22, transientGain: 0.18, panSpread: 0.24 });
    case 'bowed_glass':
      return buildTonePlanVoice([
        { freqMul: 1, type: 'triangle', volumeMul: 0.72, durationSeconds: 0.9, cutoff: 2000, q: 1.6 },
        { freqMul: 2.01, type: 'sine', volumeMul: 0.24, durationSeconds: 0.76, offsetSeconds: 0.06, cutoff: 2800, q: 1.1 },
        { freqMul: 0.5, type: 'sine', volumeMul: 0.14, durationSeconds: 0.68, offsetSeconds: 0.03, cutoff: 1200, q: 0.9 },
      ], { attackScale: 0.18, releaseScale: 0.78, transientGain: 0.04, panSpread: 0.18 });
    case 'kalimba_tine':
      return buildTonePlanVoice([
        { freqMul: 1, type: 'triangle', volumeMul: 0.84, durationSeconds: 0.24, cutoff: 2200, q: 2.1 },
        { freqMul: 2.04, type: 'sine', volumeMul: 0.22, durationSeconds: 0.16, offsetSeconds: 0.012, cutoff: 3200, q: 1.2 },
      ], { attackScale: 0.012, releaseScale: 0.22, transientGain: 0.18, panSpread: 0.18 });
    case 'gong_wash':
      return buildTonePlanVoice([
        { freqMul: 1, type: 'sine', volumeMul: 0.82, durationSeconds: 0.66, cutoff: 1600, q: 1.4 },
        { freqMul: 1.5, type: 'triangle', volumeMul: 0.28, durationSeconds: 0.52, offsetSeconds: 0.02, cutoff: 2200, q: 1.1 },
        { freqMul: 2.48, type: 'sine', volumeMul: 0.18, durationSeconds: 0.4, offsetSeconds: 0.06, cutoff: 2600, q: 1 },
      ], { attackScale: 0.08, releaseScale: 0.62, transientGain: 0.08, panSpread: 0.2 });
    case 'chime_spray':
      return buildTonePlanVoice([
        { freqMul: 1, type: 'sine', volumeMul: 0.74, durationSeconds: 0.22, cutoff: 3400, q: 3.6 },
        { freqMul: 2.62, type: 'triangle', volumeMul: 0.22, durationSeconds: 0.14, offsetSeconds: 0.01, cutoff: 4600, q: 2.2 },
        { freqMul: 3.94, type: 'sine', volumeMul: 0.12, durationSeconds: 0.1, offsetSeconds: 0.016, cutoff: 5400, q: 1.8 },
      ], { attackScale: 0.012, releaseScale: 0.26, transientGain: 0.18, panSpread: 0.24 });
    case 'dust_pulse':
      return buildTonePlanVoice([
        { freqMul: 1, type: 'triangle', volumeMul: 0.62, durationSeconds: 0.14, cutoff: 2600, q: 2.8 },
        { freqMul: 2.2, type: 'sine', volumeMul: 0.18, durationSeconds: 0.1, offsetSeconds: 0.004, cutoff: 4200, q: 2.2 },
        { freqMul: 3.36, type: 'sine', volumeMul: 0.1, durationSeconds: 0.08, offsetSeconds: 0.012, cutoff: 5200, q: 1.6 },
      ], { attackScale: 0.01, releaseScale: 0.18, transientGain: 0.14, panSpread: 0.22 });
  }
}

function buildParticlePresetVoice(preset: string): InstrumentVoiceDef | null {
  const plan = PARTICLE_TONE_PLANS[preset];
  if (!plan) return null;
  const softer = new Set(['crystal_bowl', 'velvet_bloom', 'shimmer_pad', 'shimmer']);
  const bassier = new Set(['gong', 'dust', 'pebble', 'woodblock']);
  return buildTonePlanVoice(plan, {
    attackScale: softer.has(preset) ? 0.08 : 0.02,
    releaseScale: softer.has(preset) ? 0.72 : bassier.has(preset) ? 0.26 : 0.42,
    transientGain: softer.has(preset) ? 0.05 : 0.14,
    panSpread: softer.has(preset) ? 0.14 : 0.2,
    octaveBias: bassier.has(preset) ? -1 : undefined,
  });
}

function buildDronePresetVoice(preset: DronePreset): InstrumentVoiceDef {
  const cfg = DRONE_PRESET_MAP[preset] ?? DRONE_PRESET_MAP.warm_pad;
  const isDarkSub = preset === 'dark_sub';
  const overtoneRatio = isDarkSub ? 2 : cfg.overtoneRatio;
  const overtoneDetune = isDarkSub ? 0 : cfg.overtoneDriftCents;
  const octaveBias = preset === 'cello' || preset === 'membrane_bloom' ? -1 : undefined;
  return {
    oscillators: [
      { type: cfg.oscA, gain: clamp(cfg.gainA * 10, 0.12, 0.32), freqMul: 1 },
      { type: cfg.oscB, gain: clamp((cfg.gainBBase + cfg.gainBProfile) * (isDarkSub ? 4.5 : 10), 0.035, isDarkSub ? 0.11 : 0.24), freqMul: overtoneRatio, detune: overtoneDetune },
    ],
    filterType: cfg.filterType,
    filterFrequency: clamp(cfg.cutoffBase + cfg.cutoffSpan * 0.35, 380, 3600),
    filterQ: clamp(cfg.qBase + cfg.qSpan * 0.2, 0.5, 4.2),
    attackScale: 0.22,
    releaseScale: 0.92,
    transientGain: 0.03,
    panSpread: 0.1,
    octaveBias,
  };
}

function buildResidentPresetVoice(preset: string): InstrumentVoiceDef | null {
  const resident = RESIDENT_SOUND_OPTIONS.find((entry) => entry.value === preset);
  if (!resident) return null;
  const base = buildParticlePresetVoice(resident.collision.preset);
  if (!base) return null;
  return {
    ...base,
    oscillators: base.oscillators.map((osc, index) => ({
      ...osc,
      gain: clamp(osc.gain * resident.collision.ampMul * (index === 0 ? 1 : 0.82), 0.03, 0.34),
      freqMul: (osc.freqMul ?? 1) * resident.collision.freqMul,
    })),
    attackScale: clamp(base.attackScale * 0.9, 0.01, 0.2),
    releaseScale: clamp(base.releaseScale * 0.9, 0.12, 0.9),
  };
}

function resolveSharedPresetVoice(presetId: string) {
  if (presetId.startsWith('wave:')) return buildWavePresetVoice(presetId.slice('wave:'.length) as WaveSoundPreset);
  if (presetId.startsWith('particle:')) return buildParticlePresetVoice(presetId.slice('particle:'.length));
  if (presetId.startsWith('drone:')) return buildDronePresetVoice(presetId.slice('drone:'.length) as DronePreset);
  if (presetId.startsWith('resident:')) return buildResidentPresetVoice(presetId.slice('resident:'.length));
  return null;
}

export function resolveInstrumentDef(presetId: string | undefined, samplePlaybackMap: Map<string, SamplePlaybackDef>): ResolvedInstrumentDef {
  const samplePlayback = presetId ? samplePlaybackMap.get(presetId) : undefined;
  if (samplePlayback) return samplePlayback;
  const registryEntry = resolveMelodicSoundEntry(presetId);
  const voicePresetId = registryEntry?.adapterPresetId ?? presetId ?? 'subPulse';
  const sharedVoice = typeof voicePresetId === 'string' ? resolveSharedPresetVoice(voicePresetId) : null;
  return { kind: 'synth' as const, presetId: voicePresetId, voice: sharedVoice ?? INSTRUMENT_DEFS[voicePresetId] ?? INSTRUMENT_DEFS.subPulse };
}

const INSTRUMENT_DEFS: Record<LoopTrackInstrumentPreset, InstrumentVoiceDef> = {
  subPulse: {
    oscillators: [
      { type: 'sine', gain: 0.78 },
      { type: 'sawtooth', gain: 0.22, detune: -4 },
    ],
    filterType: 'lowpass',
    filterFrequency: 920,
    filterQ: 0.5,
    attackScale: 0.08,
    releaseScale: 0.34,
    transientGain: 0.12,
    panSpread: 0.06,
    octaveBias: -1,
  },
  acidSquare: {
    oscillators: [
      { type: 'square', gain: 0.55 },
      { type: 'sawtooth', gain: 0.4, detune: 6 },
    ],
    filterType: 'bandpass',
    filterFrequency: 1200,
    filterQ: 2.5,
    attackScale: 0.04,
    releaseScale: 0.22,
    transientGain: 0.18,
    panSpread: 0.08,
    octaveBias: -1,
  },
  reedTone: {
    oscillators: [
      { type: 'sawtooth', gain: 0.52 },
      { type: 'triangle', gain: 0.34, detune: -3 },
    ],
    filterType: 'bandpass',
    filterFrequency: 980,
    filterQ: 1.6,
    attackScale: 0.06,
    releaseScale: 0.3,
    transientGain: 0.1,
    panSpread: 0.12,
  },
  glassPad: {
    oscillators: [
      { type: 'sine', gain: 0.62 },
      { type: 'triangle', gain: 0.24, detune: 5 },
      { type: 'sine', gain: 0.12, detune: 12 },
    ],
    filterType: 'lowpass',
    filterFrequency: 2800,
    filterQ: 0.2,
    attackScale: 0.18,
    releaseScale: 0.55,
    transientGain: 0.06,
    panSpread: 0.16,
  },
  airPluck: {
    oscillators: [
      { type: 'triangle', gain: 0.45 },
      { type: 'square', gain: 0.16, detune: 7 },
    ],
    filterType: 'highpass',
    filterFrequency: 640,
    filterQ: 0.9,
    attackScale: 0.03,
    releaseScale: 0.18,
    transientGain: 0.2,
    panSpread: 0.2,
    octaveBias: 1,
  },
  metalBloom: {
    oscillators: [
      { type: 'triangle', gain: 0.3 },
      { type: 'sawtooth', gain: 0.18, detune: 19 },
      { type: 'square', gain: 0.14, detune: -17 },
    ],
    filterType: 'highpass',
    filterFrequency: 1100,
    filterQ: 1.7,
    attackScale: 0.02,
    releaseScale: 0.28,
    transientGain: 0.16,
    panSpread: 0.22,
    octaveBias: 1,
  },
  velvetChoir: {
    oscillators: [
      { type: 'triangle', gain: 0.38 },
      { type: 'sine', gain: 0.28, detune: 7 },
      { type: 'sawtooth', gain: 0.12, detune: -7 },
    ],
    filterType: 'lowpass',
    filterFrequency: 2100,
    filterQ: 0.45,
    attackScale: 0.2,
    releaseScale: 0.62,
    transientGain: 0.04,
    panSpread: 0.18,
  },
  hollowPluck: {
    oscillators: [
      { type: 'square', gain: 0.22 },
      { type: 'triangle', gain: 0.34, detune: 3 },
      { type: 'sine', gain: 0.16, detune: -12 },
    ],
    filterType: 'bandpass',
    filterFrequency: 1450,
    filterQ: 1.2,
    attackScale: 0.025,
    releaseScale: 0.16,
    transientGain: 0.24,
    panSpread: 0.14,
  },
  neonSaw: {
    oscillators: [
      { type: 'sawtooth', gain: 0.48 },
      { type: 'sawtooth', gain: 0.18, detune: 9 },
      { type: 'square', gain: 0.14, detune: -7 },
    ],
    filterType: 'lowpass',
    filterFrequency: 1900,
    filterQ: 0.8,
    attackScale: 0.03,
    releaseScale: 0.24,
    transientGain: 0.18,
    panSpread: 0.1,
  },
  fmBell: {
    oscillators: [
      { type: 'sine', gain: 0.42 },
      { type: 'square', gain: 0.1, detune: 14 },
      { type: 'triangle', gain: 0.16, detune: 28 },
    ],
    filterType: 'highpass',
    filterFrequency: 900,
    filterQ: 0.7,
    attackScale: 0.015,
    releaseScale: 0.48,
    transientGain: 0.14,
    panSpread: 0.24,
    octaveBias: 1,
  },
  bowGlass: {
    oscillators: [
      { type: 'triangle', gain: 0.34 },
      { type: 'sine', gain: 0.18, detune: 5 },
      { type: 'sawtooth', gain: 0.08, detune: -5 },
    ],
    filterType: 'bandpass',
    filterFrequency: 1650,
    filterQ: 1.1,
    attackScale: 0.14,
    releaseScale: 0.52,
    transientGain: 0.05,
    panSpread: 0.2,
  },
  amberPad: {
    oscillators: [
      { type: 'sine', gain: 0.34 },
      { type: 'triangle', gain: 0.26, detune: -4 },
      { type: 'sawtooth', gain: 0.1, detune: 4 },
    ],
    filterType: 'lowpass',
    filterFrequency: 1450,
    filterQ: 0.35,
    attackScale: 0.24,
    releaseScale: 0.7,
    transientGain: 0.03,
    panSpread: 0.16,
  },
  celloVoice: {
    oscillators: [
      { type: 'sawtooth', gain: 0.42 },
      { type: 'triangle', gain: 0.2, detune: -5 },
      { type: 'sine', gain: 0.08, detune: 7 },
    ],
    filterType: 'lowpass',
    filterFrequency: 980,
    filterQ: 0.9,
    attackScale: 0.08,
    releaseScale: 0.44,
    transientGain: 0.06,
    panSpread: 0.08,
    octaveBias: -1,
  },
  saxLead: {
    oscillators: [
      { type: 'sawtooth', gain: 0.36 },
      { type: 'square', gain: 0.2, detune: 3 },
      { type: 'triangle', gain: 0.1, detune: -4 },
    ],
    filterType: 'bandpass',
    filterFrequency: 1200,
    filterQ: 1.8,
    attackScale: 0.04,
    releaseScale: 0.26,
    transientGain: 0.12,
    panSpread: 0.12,
  },
  gongWashVoice: {
    oscillators: [
      { type: 'sine', gain: 0.28 },
      { type: 'triangle', gain: 0.16, detune: 19 },
      { type: 'sawtooth', gain: 0.08, detune: -12 },
    ],
    filterType: 'bandpass',
    filterFrequency: 1650,
    filterQ: 0.9,
    attackScale: 0.02,
    releaseScale: 0.66,
    transientGain: 0.18,
    panSpread: 0.24,
    octaveBias: 1,
  },
  dustTexture: {
    oscillators: [
      { type: 'triangle', gain: 0.26 },
      { type: 'square', gain: 0.1, detune: 11 },
      { type: 'sawtooth', gain: 0.08, detune: -17 },
    ],
    filterType: 'highpass',
    filterFrequency: 1400,
    filterQ: 1.1,
    attackScale: 0.01,
    releaseScale: 0.22,
    transientGain: 0.2,
    panSpread: 0.26,
    octaveBias: 1,
  },
  woodPulse: {
    oscillators: [
      { type: 'triangle', gain: 0.3 },
      { type: 'square', gain: 0.12, detune: -3 },
      { type: 'sine', gain: 0.08, detune: 12 },
    ],
    filterType: 'bandpass',
    filterFrequency: 980,
    filterQ: 1.4,
    attackScale: 0.012,
    releaseScale: 0.12,
    transientGain: 0.22,
    panSpread: 0.16,
  },
  haloStrings: {
    oscillators: [
      { type: 'triangle', gain: 0.28 },
      { type: 'sawtooth', gain: 0.14, detune: -4 },
      { type: 'sine', gain: 0.12, detune: 7 },
    ],
    filterType: 'lowpass',
    filterFrequency: 2100,
    filterQ: 0.4,
    attackScale: 0.18,
    releaseScale: 0.6,
    transientGain: 0.04,
    panSpread: 0.18,
  },
};
