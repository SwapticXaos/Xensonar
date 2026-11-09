import {
  ensureLocalFieldState,
  getLocalFieldTargetState,
  localFieldDynamicFadeGain,
  localFieldPitchSemitoneOffset,
  resolveLocalFieldCurve,
} from '../../canonicalForge/localField';
import type { RootFollowBankEntryConfig, RootFollowCarrierTimbreSnapshot, RootFollowSynthNoteSnapshot } from '../../../xensonar/rootFollow/rootFollowTypes';
import type { DonatelloFormantRenderPlan } from './donatelloFormantTypes';

const DEFAULT_SAMPLE_RATE = 44100;
const TWO_PI = Math.PI * 2;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

function softClip(value: number, drive: number) {
  const gain = 1 + clamp(drive, 0, 1) * 2.4;
  return Math.tanh(value * gain) / Math.tanh(gain);
}

function waveformSample(type: OscillatorType, phase: number) {
  const normalized = ((phase / TWO_PI) % 1 + 1) % 1;
  switch (type) {
    case 'square':
      return normalized < 0.5 ? 1 : -1;
    case 'sawtooth':
      return 2 * normalized - 1;
    case 'triangle':
      return 1 - 4 * Math.abs(normalized - 0.5);
    case 'sine':
    default:
      return Math.sin(phase);
  }
}

function createWritableAudioBuffer(length: number, sampleRate: number): AudioBuffer {
  const safeLength = Math.max(1, Math.round(length));
  const safeSampleRate = Math.max(8000, Math.round(sampleRate || DEFAULT_SAMPLE_RATE));
  const OfflineCtor = (globalThis as unknown as { OfflineAudioContext?: typeof OfflineAudioContext; webkitOfflineAudioContext?: typeof OfflineAudioContext }).OfflineAudioContext
    ?? (globalThis as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext;
  if (OfflineCtor) {
    const ctx = new OfflineCtor(1, 1, safeSampleRate);
    return ctx.createBuffer(1, safeLength, safeSampleRate);
  }
  const AudioCtor = (globalThis as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
    ?? (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) {
    throw new Error('AudioBuffer kann in dieser Umgebung nicht erzeugt werden.');
  }
  const ctx = new AudioCtor({ sampleRate: safeSampleRate });
  return ctx.createBuffer(1, safeLength, safeSampleRate);
}

function getTimbreOscillators(timbre: RootFollowCarrierTimbreSnapshot | null | undefined) {
  if (timbre?.oscillators?.length) return timbre.oscillators;
  return [
    { type: 'sawtooth' as OscillatorType, gain: 0.28, freqMul: 1, detune: 0 },
    { type: 'triangle' as OscillatorType, gain: 0.12, freqMul: 2, detune: -7 },
    { type: 'sine' as OscillatorType, gain: 0.08, freqMul: 0.5, detune: 4 },
  ];
}

function dominantTimbreWaveform(timbre: RootFollowCarrierTimbreSnapshot | null | undefined): OscillatorType {
  const oscillators = getTimbreOscillators(timbre);
  const dominant = [...oscillators].sort((a, b) => clamp(b.gain, 0, 1) - clamp(a.gain, 0, 1))[0];
  return dominant?.type ?? 'triangle';
}

function tonalAnchorDrive(timbre: RootFollowCarrierTimbreSnapshot | null | undefined) {
  const outputGain = clamp(timbre?.outputGain ?? 0.82, 0.18, 1);
  const transient = clamp(timbre?.transientGain ?? 0.1, 0, 0.45);
  const filterQ = clamp(timbre?.filterQ ?? 0.9, 0.1, 8);
  return clamp(0.18 + outputGain * 0.26 + transient * 0.18 + Math.min(1, filterQ / 8) * 0.08, 0.16, 0.56);
}

function noteBaseHz(config: RootFollowBankEntryConfig, note: RootFollowSynthNoteSnapshot) {
  if (Number.isFinite(note.lineHz ?? NaN) && (note.lineHz ?? 0) > 0) return Number(note.lineHz);
  if (Number.isFinite(note.anchorHz ?? NaN) && (note.anchorHz ?? 0) > 0) return Number(note.anchorHz);
  const baseHz = Math.max(1, config.synthPattern?.baseHz ?? config.synthPatch?.baseHz ?? 110);
  return clamp(baseHz * Math.pow(2, ((note.channelIndex || 0) + (note.octaveOffset || 0) * 12) / 12), 1, 16000);
}

function sampleCurve(curve: number[] | Float32Array | null, ratio: number) {
  if (!curve?.length) return 0;
  const safe = clamp(ratio, 0, 1);
  const pos = safe * Math.max(0, curve.length - 1);
  const left = Math.floor(pos);
  const right = Math.min(curve.length - 1, left + 1);
  const mix = pos - left;
  return Number(curve[left] ?? 0) * (1 - mix) + Number(curve[right] ?? 0) * mix;
}


type DonatelloBandFilterState = {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
};

export type DonatelloRendererAdapterSummary = {
  rendererKind: 'donatello-offline-formant-buffer-v2-tonal-anchor';
  bandCount: number;
  carrierOscillatorCount: number;
  estimatedFilterCount: number;
  estimatedAutomationCurves: number;
  textureCurveCount: number;
  rootReferenceHz: number;
  durationSec: number;
  maxBandGain: number;
  maxRoughness: number;
  maxTransientDust: number;
  safeHeadroom: number;
};

function maxCurveValue(curve: number[] | null | undefined) {
  return (curve ?? []).reduce((max, value) => Math.max(max, clamp(value, 0, Number.MAX_SAFE_INTEGER)), 0);
}

export function summarizeDonatelloRendererAdapterPlan(args: {
  plan: DonatelloFormantRenderPlan;
  durationSec: number;
  timbre?: RootFollowCarrierTimbreSnapshot | null;
}): DonatelloRendererAdapterSummary {
  const oscillators = getTimbreOscillators(args.timbre ?? null).slice(0, 6);
  const maxBandGain = args.plan.bands.reduce((max, band) => Math.max(max, maxCurveValue(band.gainCurve)), 0);
  return {
    rendererKind: 'donatello-offline-formant-buffer-v2-tonal-anchor',
    bandCount: Math.min(args.plan.maxBands, args.plan.bands.length),
    carrierOscillatorCount: oscillators.length,
    estimatedFilterCount: Math.min(args.plan.maxBands, args.plan.bands.length),
    estimatedAutomationCurves: Math.min(args.plan.maxBands, args.plan.bands.length) * 3 + 3,
    textureCurveCount: 3,
    rootReferenceHz: Math.max(1, args.plan.rootReferenceHz || 110),
    durationSec: Math.max(0.25, args.durationSec || 1),
    maxBandGain,
    maxRoughness: maxCurveValue(args.plan.roughnessCurve),
    maxTransientDust: maxCurveValue(args.plan.transientDustCurve),
    safeHeadroom: 0.58 / Math.sqrt(Math.max(1, Math.min(8, args.plan.bands.length || 1))),
  };
}

function deterministicNoise(index: number) {
  let x = (index + 1) * 1103515245 + 12345;
  x = ((x >>> 16) ^ x) >>> 0;
  return ((x % 20001) / 10000) - 1;
}

function bandpassSample(input: number, centerHz: number, bandwidthHz: number, sampleRate: number, state: DonatelloBandFilterState) {
  const safeCenterHz = clamp(centerHz, 18, Math.min(18000, sampleRate * 0.45));
  const safeBandwidthHz = clamp(bandwidthHz, 8, Math.max(12, sampleRate * 0.35));
  const q = clamp(safeCenterHz / Math.max(8, safeBandwidthHz), 0.45, 18);
  const w0 = clamp(TWO_PI * safeCenterHz / sampleRate, 0.00001, Math.PI * 0.98);
  const cos = Math.cos(w0);
  const sin = Math.sin(w0);
  const alpha = sin / (2 * q);
  const b0 = alpha;
  const b1 = 0;
  const b2 = -alpha;
  const a0 = 1 + alpha;
  const a1 = -2 * cos;
  const a2 = 1 - alpha;
  const out = (b0 / a0) * input + (b1 / a0) * state.x1 + (b2 / a0) * state.x2 - (a1 / a0) * state.y1 - (a2 / a0) * state.y2;
  state.x2 = state.x1;
  state.x1 = input;
  state.y2 = state.y1;
  state.y1 = clamp(out, -4, 4);
  return state.y1;
}

function textureEnvelope(plan: DonatelloFormantRenderPlan, ratio: number) {
  const rough = sampleCurve(plan.roughnessCurve, ratio);
  const residual = sampleCurve(plan.residualEnergyCurve, ratio);
  const dust = sampleCurve(plan.transientDustCurve, ratio);
  return {
    rough: clamp(rough, 0, 1),
    residual: clamp(residual, 0, 1),
    dust: clamp(dust, 0, 1),
  };
}

export async function renderDonatelloFormantPlanToAudioBuffer(args: {
  plan: DonatelloFormantRenderPlan;
  durationSec: number;
  bpm?: number;
  sampleRate?: number;
  timbre?: RootFollowCarrierTimbreSnapshot | null;
  rootHz?: number | null;
  previewGain?: number;
}): Promise<AudioBuffer> {
  const plan = args.plan;
  const sampleRate = Math.max(8000, Math.round(args.sampleRate || DEFAULT_SAMPLE_RATE));
  const durationSec = Math.max(0.25, Number(args.durationSec) || 1);
  const buffer = createWritableAudioBuffer(Math.ceil(durationSec * sampleRate), sampleRate);
  const output = buffer.getChannelData(0);
  const rootHz = clamp(args.rootHz ?? plan.rootReferenceHz ?? 110, 18, 12000);
  const timbre = args.timbre ?? null;
  const oscillators = getTimbreOscillators(timbre).slice(0, 6);
  const phases = oscillators.map(() => 0);
  const bandStates: DonatelloBandFilterState[] = plan.bands.map(() => ({ x1: 0, x2: 0, y1: 0, y2: 0 }));
  const anchorPhases = plan.bands.map((_, index) => index * 0.73);
  const anchorWaveform = dominantTimbreWaveform(timbre);
  const anchorDrive = tonalAnchorDrive(timbre);
  const drive = clamp((timbre?.drive ?? 0.18) + plan.summary.maxRoughnessSlice * 0.12, 0, 1);
  const headroom = 0.52 / Math.sqrt(Math.max(1, Math.min(8, plan.bands.length || 1)));
  const previewGain = clamp(args.previewGain ?? 0.82, 0, 1);
  const attackSamples = Math.max(1, Math.round(0.006 * sampleRate));
  const releaseSamples = Math.max(1, Math.round(0.02 * sampleRate));

  for (let sample = 0; sample < output.length; sample += 1) {
    const ratio = output.length <= 1 ? 0 : sample / Math.max(1, output.length - 1);
    const texture = textureEnvelope(plan, ratio);
    const dustNoise = deterministicNoise(sample * 7 + 13);
    let carrier = 0;
    oscillators.forEach((osc, oscIndex) => {
      const oscFreq = clamp(rootHz * clamp(osc.freqMul, 0.0625, 16) * Math.pow(2, clamp(osc.detune, -2400, 2400) / 1200), 12, 18000);
      phases[oscIndex] = (phases[oscIndex] ?? 0) + TWO_PI * oscFreq / sampleRate;
      carrier += waveformSample(osc.type, phases[oscIndex] ?? 0) * clamp(osc.gain, 0, 0.7);
    });
    const broadNoise = deterministicNoise(sample);
    carrier += broadNoise * (0.012 + texture.rough * 0.055 + texture.residual * 0.04 + texture.dust * 0.025);

    let shaped = 0;
    let tonalAnchor = 0;
    plan.bands.forEach((band, index) => {
      const centerRatio = clamp(sampleCurve(band.centerRatioCurve, ratio), 0.03125, 96);
      const bandwidthRatio = clamp(sampleCurve(band.bandwidthRatioCurve, ratio), 0.0015, 16);
      const gain = clamp(sampleCurve(band.gainCurve, ratio), 0, 1);
      const rough = clamp(sampleCurve(band.roughnessCurve ?? null, ratio), 0, 1);
      if (gain <= 0.0005) return;
      const centerHz = clamp(rootHz * centerRatio, 18, sampleRate * 0.45);
      const bandwidthHz = clamp(rootHz * bandwidthRatio * (1 + rough * 0.5), 8, sampleRate * 0.35);
      const bandOut = bandpassSample(carrier, centerHz, bandwidthHz, sampleRate, bandStates[index]!);
      const roleGain = band.role === 'core-line' ? 1 : band.role === 'body-band' ? 0.86 : band.role === 'surface-band' ? 0.58 : 0.38;
      shaped += bandOut * gain * roleGain * 0.72;

      const anchorFreq = clamp(centerHz, 18, Math.min(16000, sampleRate * 0.42));
      const anchorDetune = ((index % 3) - 1) * clamp(timbre?.panSpread ?? 0.14, 0, 0.65) * 2.5;
      anchorPhases[index] = (anchorPhases[index] ?? 0) + TWO_PI * clamp(anchorFreq * Math.pow(2, anchorDetune / 1200), 18, sampleRate * 0.42) / sampleRate;
      const anchorWave = waveformSample(anchorWaveform, anchorPhases[index] ?? 0);
      const anchorRoleGain = band.role === 'core-line' ? 1 : band.role === 'body-band' ? 0.72 : 0.42;
      const narrowness = clamp(1 / (1 + bandwidthRatio * 4), 0.18, 1);
      const anchorGain = gain * anchorRoleGain * (0.28 + narrowness * 0.42) * anchorDrive * (1 - texture.dust * 0.18);
      tonalAnchor += softClip(anchorWave, drive * 0.55 + rough * 0.18) * anchorGain;
    });

    const dustPulse = texture.dust > 0.001 ? dustNoise * texture.dust * 0.028 : 0;
    const textureFloor = broadNoise * (texture.rough * 0.018 + texture.residual * 0.014) + dustPulse;
    const attackGain = clamp(sample / attackSamples, 0, 1);
    const releaseGain = clamp((output.length - sample) / releaseSamples, 0, 1);
    const envelope = Math.min(attackGain, releaseGain, 1);
    output[sample] = softClip(shaped + tonalAnchor + textureFloor, drive) * envelope * headroom * previewGain;
  }

  const { peak } = analyzeAudioBufferPeak(buffer);
  if (peak > 0.94) {
    const scale = 0.9 / peak;
    for (let index = 0; index < output.length; index += 1) output[index] *= scale;
  }
  return buffer;
}

function buildLocalTargetCurve(note: RootFollowSynthNoteSnapshot, target: 'dynamic-fade' | 'pitch-elastic', sampleCount = 96) {
  if (!note.localField) return null;
  const field = getLocalFieldTargetState(ensureLocalFieldState(note.localField), target);
  if (!field.enabled || field.bypassed) return null;
  const resolved = resolveLocalFieldCurve(field, Math.max(32, sampleCount)).resolved;
  const mapped = new Array(Math.max(32, sampleCount)).fill(0).map((_, index, all) => {
    const progress = all.length <= 1 ? 0 : index / Math.max(1, all.length - 1);
    const start = clamp(field.range.startRatio, 0, 1);
    const end = clamp(field.range.endRatio, 0, 1);
    if (progress < start || progress > end) return target === 'dynamic-fade' ? 1 : 0;
    const localRatio = clamp((progress - start) / Math.max(0.0001, end - start), 0, 1);
    const value = sampleCurve(resolved, localRatio);
    return target === 'dynamic-fade' ? localFieldDynamicFadeGain(value) : localFieldPitchSemitoneOffset(value);
  });
  return mapped;
}

export function analyzeAudioBufferPeak(buffer: AudioBuffer) {
  let peak = 0;
  let sumSquares = 0;
  let count = 0;
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let index = 0; index < data.length; index += 1) {
      const value = Math.abs(data[index] ?? 0);
      peak = Math.max(peak, value);
      sumSquares += value * value;
      count += 1;
    }
  }
  return { peak, rms: count ? Math.sqrt(sumSquares / count) : 0 };
}

export async function renderCarrierIntegralConfigToAudioBuffer(args: {
  config: RootFollowBankEntryConfig;
  durationSec: number;
  bpm: number;
  sampleRate?: number;
}): Promise<AudioBuffer> {
  const { config } = args;
  const sampleRate = Math.max(8000, Math.round(args.sampleRate || DEFAULT_SAMPLE_RATE));
  const durationSec = Math.max(0.25, Number(args.durationSec) || 1);
  const buffer = createWritableAudioBuffer(Math.ceil(durationSec * sampleRate), sampleRate);
  const output = buffer.getChannelData(0);
  const pattern = config.synthPattern;
  if (!pattern?.notes?.length) return buffer;
  const secondsPerBeat = 60 / Math.max(30, args.bpm || 108);
  const timbre = config.synthPatch?.carrierIntegralTimbre ?? null;
  const oscillators = getTimbreOscillators(timbre);
  const drive = clamp(timbre?.drive ?? 0.12, 0, 1);
  const headroom = 0.62 / Math.sqrt(Math.max(1, Math.min(24, pattern.notes.length)));

  for (const note of pattern.notes) {
    if (!Number.isFinite(note.durationBeats) || note.durationBeats <= 0) continue;
    const noteStartSec = Math.max(0, note.startBeat * secondsPerBeat);
    const noteDurationSec = Math.max(0.012, note.durationBeats * Math.max(0.05, note.gate || 1) * secondsPerBeat);
    const startSample = Math.max(0, Math.floor(noteStartSec * sampleRate));
    const endSample = Math.min(output.length, Math.ceil((noteStartSec + noteDurationSec) * sampleRate));
    if (endSample <= startSample) continue;
    const baseHz = noteBaseHz(config, note);
    const dynamicCurve = buildLocalTargetCurve(note, 'dynamic-fade', 96);
    const pitchCurve = buildLocalTargetCurve(note, 'pitch-elastic', 96);
    const attackSec = Math.max(0.003, Math.min(noteDurationSec * 0.35, Math.max(0, note.fadeInBeats || 0.01) * secondsPerBeat || 0.008));
    const releaseSec = Math.max(0.004, Math.min(noteDurationSec * 0.45, Math.max(0, note.fadeOutBeats || 0.04) * secondsPerBeat || 0.025));
    const phases = oscillators.map(() => 0);
    const velocity = clamp(note.velocity || 0.72, 0, 1.2);

    for (let sample = startSample; sample < endSample; sample += 1) {
      const localSec = (sample - startSample) / sampleRate;
      const ratio = clamp(localSec / Math.max(0.0001, noteDurationSec), 0, 1);
      const pitchSemitones = sampleCurve(pitchCurve, ratio);
      const dynamicGain = dynamicCurve ? sampleCurve(dynamicCurve, ratio) : 1;
      const freq = clamp(baseHz * Math.pow(2, pitchSemitones / 12), 12, 16000);
      const attackGain = clamp(localSec / attackSec, 0, 1);
      const releaseGain = clamp((noteDurationSec - localSec) / releaseSec, 0, 1);
      const envelope = Math.min(attackGain, releaseGain, 1);
      let value = 0;
      oscillators.forEach((osc, oscIndex) => {
        const oscFreq = freq * clamp(osc.freqMul, 0.0625, 16) * Math.pow(2, clamp(osc.detune, -2400, 2400) / 1200);
        phases[oscIndex] = (phases[oscIndex] ?? 0) + TWO_PI * oscFreq / sampleRate;
        value += waveformSample(osc.type, phases[oscIndex] ?? 0) * clamp(osc.gain, 0, 0.7);
      });
      output[sample] += softClip(value, drive) * envelope * dynamicGain * velocity * headroom;
    }
  }

  const { peak } = analyzeAudioBufferPeak(buffer);
  if (peak > 0.98) {
    const scale = 0.92 / peak;
    for (let index = 0; index < output.length; index += 1) output[index] *= scale;
  }
  return buffer;
}
