import type { RootFollowFormantBandPlan, RootFollowFormantWindowPlan } from './rootFollowTypes';
import type { RootFollowFormantRenderArgs, RootFollowFormantRenderResult } from './rootFollowRendererTypes';
import { clamp } from '../rooms/resonanceRuntimeMath';
import { markAudioTrafficEvent } from '../audioTraffic/audioTrafficForensics';
import { recordAudioPressureCount } from '../../../core/audio/audioPressureMap';
import { registerRootFollowFormantAudioNode } from './rootFollowAudioNodeRegistry';

const ROOT_FOLLOW_FORMANT_SEGMENT_SEC = 0.16;
const ROOT_FOLLOW_FORMANT_ADVANCE_SEC = 0.08;
const ROOT_FOLLOW_FORMANT_MIN_LEAD_SEC = 0.018;
const ROOT_FOLLOW_FORMANT_LEAD_SEC = 0.12;
const ROOT_FOLLOW_FORMANT_CURVE_POINTS = 48;
const ROOT_FOLLOW_FORMANT_MIN_GAIN = 0.00001;
const ROOT_FOLLOW_FORMANT_MAX_BANDS = 8;

const NOISE_BUFFER_SECONDS = 1.0;
const noiseBufferCache = new WeakMap<BaseAudioContext, AudioBuffer>();

function safeNumber(value: unknown, fallback: number) {
  return Number.isFinite(value ?? NaN) ? Number(value) : fallback;
}

function sampleCurve(curve: readonly number[] | undefined, ratio: number, fallback = 0) {
  if (!curve?.length) return fallback;
  const safeRatio = ((ratio % 1) + 1) % 1;
  const position = safeRatio * Math.max(0, curve.length - 1);
  const left = Math.floor(position);
  const right = Math.min(curve.length - 1, left + 1);
  const frac = position - left;
  const leftValue = safeNumber(curve[left], fallback);
  const rightValue = safeNumber(curve[right], leftValue);
  return leftValue + (rightValue - leftValue) * frac;
}

function makeAutomationCurve(args: {
  count?: number;
  segmentStart: number;
  segmentDuration: number;
  transportAnchor: number;
  loopDurationSec: number;
  map: (phaseRatio: number, pointIndex: number) => number;
}) {
  const count = Math.max(8, Math.round(args.count ?? ROOT_FOLLOW_FORMANT_CURVE_POINTS));
  const out = new Float32Array(count);
  for (let index = 0; index < count; index += 1) {
    const localRatio = count <= 1 ? 0 : index / Math.max(1, count - 1);
    const absoluteSec = args.segmentStart + args.segmentDuration * localRatio;
    const phaseRatio = ((absoluteSec - args.transportAnchor) / Math.max(0.0001, args.loopDurationSec)) % 1;
    out[index] = args.map(phaseRatio < 0 ? phaseRatio + 1 : phaseRatio, index);
  }
  return out;
}

function makeSegmentWindowCurve(count = ROOT_FOLLOW_FORMANT_CURVE_POINTS) {
  const out = new Float32Array(Math.max(8, count));
  for (let index = 0; index < out.length; index += 1) {
    const phase = out.length <= 1 ? 0 : index / Math.max(1, out.length - 1);
    const fade = Math.sin(Math.PI * clamp(phase, 0, 1));
    out[index] = Math.max(0, Math.min(1, fade));
  }
  return out;
}

function setCurve(param: AudioParam, curve: Float32Array, start: number, duration: number, fallback: number) {
  try {
    param.cancelScheduledValues(start);
    param.setValueAtTime(Number.isFinite(curve[0] ?? NaN) ? curve[0] : fallback, start);
    param.setValueCurveAtTime(curve, start, Math.max(0.012, duration));
  } catch {
    try { param.setValueAtTime(fallback, start); } catch {}
  }
}

function createNoiseBuffer(ctx: AudioContext) {
  const existing = noiseBufferCache.get(ctx);
  if (existing) return existing;
  const length = Math.max(1, Math.round(ctx.sampleRate * NOISE_BUFFER_SECONDS));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let index = 0; index < data.length; index += 1) {
    const white = Math.random() * 2 - 1;
    // Cheap pink-ish low-pass integration. It is a neutral carrier texture, not a donor.
    last = last * 0.985 + white * 0.015;
    data[index] = clamp(last * 2.8, -1, 1);
  }
  noiseBufferCache.set(ctx, buffer);
  return buffer;
}

function registerNode(args: {
  refs: RootFollowFormantRenderArgs['refs'];
  node: AudioNode;
  cleanupDelayMs?: number;
}) {
  registerRootFollowFormantAudioNode(args);
}

function bandRoleGainScale(role: RootFollowFormantBandPlan['role']) {
  switch (role) {
    case 'body-band': return 0.32;
    case 'surface-band': return 0.24;
    case 'residual-band': return 0.18;
    case 'transient-dust': return 0.14;
    case 'core-line':
    default: return 0.26;
  }
}

function bandRoleOscType(role: RootFollowFormantBandPlan['role']): OscillatorType {
  switch (role) {
    case 'core-line': return 'triangle';
    case 'body-band': return 'sawtooth';
    case 'surface-band': return 'sawtooth';
    case 'residual-band': return 'triangle';
    case 'transient-dust': return 'square';
    default: return 'sawtooth';
  }
}

function scheduleFormantBand(args: {
  ctx: AudioContext;
  destination: GainNode;
  refs: RootFollowFormantRenderArgs['refs'];
  band: RootFollowFormantBandPlan;
  bandIndex: number;
  segmentStart: number;
  segmentDuration: number;
  transportAnchor: number;
  loopDurationSec: number;
  rootHz: number;
  outputScale: number;
}) {
  const { ctx, destination, refs, band, bandIndex, segmentStart, segmentDuration, transportAnchor, loopDurationSec, rootHz, outputScale } = args;
  const segmentEnd = segmentStart + segmentDuration;
  if (segmentEnd <= ctx.currentTime + 0.003 || segmentDuration <= 0.012) return 0;

  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const bandGain = ctx.createGain();
  const panner = ctx.createStereoPanner();
  const windowCurve = makeSegmentWindowCurve();

  osc.type = bandRoleOscType(band.role);
  filter.type = band.role === 'residual-band' ? 'peaking' : 'bandpass';
  const freqCurve = makeAutomationCurve({
    segmentStart,
    segmentDuration,
    transportAnchor,
    loopDurationSec,
    map: (phase) => clamp(rootHz * sampleCurve(band.centerRatioCurve, phase, 1), 32, 15000),
  });
  const qCurve = makeAutomationCurve({
    segmentStart,
    segmentDuration,
    transportAnchor,
    loopDurationSec,
    map: (phase) => {
      const centerHz = rootHz * sampleCurve(band.centerRatioCurve, phase, 1);
      const bandwidthHz = rootHz * sampleCurve(band.bandwidthRatioCurve, phase, 0.08);
      return clamp(centerHz / Math.max(12, bandwidthHz), 0.45, 18);
    },
  });
  const gainCurve = makeAutomationCurve({
    segmentStart,
    segmentDuration,
    transportAnchor,
    loopDurationSec,
    map: (phase, index) => {
      const bodyGain = clamp(sampleCurve(band.gainCurve, phase, 0), 0, 1);
      const confidence = clamp(sampleCurve(band.confidenceCurve, phase, 1), 0.15, 1);
      const window = windowCurve[Math.min(windowCurve.length - 1, Math.round(index / Math.max(1, ROOT_FOLLOW_FORMANT_CURVE_POINTS - 1) * (windowCurve.length - 1)))] ?? 1;
      return Math.max(ROOT_FOLLOW_FORMANT_MIN_GAIN, bodyGain * confidence * bandRoleGainScale(band.role) * outputScale * window);
    },
  });
  const oscillatorFreqCurve = makeAutomationCurve({
    segmentStart,
    segmentDuration,
    transportAnchor,
    loopDurationSec,
    map: (phase) => {
      const center = rootHz * sampleCurve(band.centerRatioCurve, phase, 1);
      // The oscillator follows the line while the filter gives the sculptural width.
      return clamp(center, 32, 12000);
    },
  });

  osc.frequency.setValueAtTime(oscillatorFreqCurve[0] ?? rootHz, segmentStart);
  setCurve(osc.frequency, oscillatorFreqCurve, segmentStart, segmentDuration, rootHz);
  setCurve(filter.frequency, freqCurve, segmentStart, segmentDuration, rootHz);
  setCurve(filter.Q, qCurve, segmentStart, segmentDuration, 2.5);
  setCurve(bandGain.gain, gainCurve, segmentStart, segmentDuration, ROOT_FOLLOW_FORMANT_MIN_GAIN);
  panner.pan.setValueAtTime(clamp(((bandIndex % 2 === 0 ? -1 : 1) * (0.08 + Math.min(0.24, bandIndex * 0.025))), -0.38, 0.38), segmentStart);

  osc.connect(filter);
  filter.connect(bandGain);
  bandGain.connect(panner);
  panner.connect(destination);
  const cleanupDelayMs = Math.max(350, (segmentEnd - ctx.currentTime + 0.18) * 1000);
  registerNode({ refs, node: osc });
  registerNode({ refs, node: filter, cleanupDelayMs });
  registerNode({ refs, node: bandGain, cleanupDelayMs });
  registerNode({ refs, node: panner, cleanupDelayMs });
  osc.start(segmentStart);
  osc.stop(segmentEnd + 0.018);
  return 1;
}

function scheduleTexture(args: {
  ctx: AudioContext;
  destination: GainNode;
  refs: RootFollowFormantRenderArgs['refs'];
  plan: RootFollowFormantWindowPlan;
  segmentStart: number;
  segmentDuration: number;
  transportAnchor: number;
  loopDurationSec: number;
  rootHz: number;
  outputScale: number;
}) {
  const { ctx, destination, refs, plan, segmentStart, segmentDuration, transportAnchor, loopDurationSec, rootHz, outputScale } = args;
  const curve = makeAutomationCurve({
    segmentStart,
    segmentDuration,
    transportAnchor,
    loopDurationSec,
    map: (phase, index) => {
      const rough = clamp(sampleCurve(plan.roughnessCurve, phase, 0), 0, 1);
      const residual = clamp(sampleCurve(plan.residualEnergyCurve, phase, 0), 0, 1);
      const dust = clamp(sampleCurve(plan.transientDustCurve, phase, 0), 0, 1);
      const window = Math.sin(Math.PI * (index / Math.max(1, ROOT_FOLLOW_FORMANT_CURVE_POINTS - 1)));
      return Math.max(ROOT_FOLLOW_FORMANT_MIN_GAIN, clamp((rough * 0.12 + residual * 0.1 + dust * 0.16) * outputScale * window, 0, 0.22));
    },
  });
  const maxGain = Array.from(curve).reduce((max, value) => Math.max(max, value), 0);
  if (maxGain <= 0.003) return 0;

  const src = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  const panner = ctx.createStereoPanner();
  src.buffer = createNoiseBuffer(ctx);
  src.loop = true;
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(clamp(rootHz * 3.2, 180, 7200), segmentStart);
  filter.Q.setValueAtTime(0.85, segmentStart);
  setCurve(gain.gain, curve, segmentStart, segmentDuration, ROOT_FOLLOW_FORMANT_MIN_GAIN);
  panner.pan.setValueAtTime(0, segmentStart);

  src.connect(filter);
  filter.connect(gain);
  gain.connect(panner);
  panner.connect(destination);
  const cleanupDelayMs = Math.max(350, (segmentStart + segmentDuration - ctx.currentTime + 0.18) * 1000);
  registerNode({ refs, node: src });
  registerNode({ refs, node: filter, cleanupDelayMs });
  registerNode({ refs, node: gain, cleanupDelayMs });
  registerNode({ refs, node: panner, cleanupDelayMs });
  src.start(segmentStart);
  src.stop(segmentStart + segmentDuration + 0.018);
  return 1;
}

export function scheduleRootFollowFormantWindow(args: RootFollowFormantRenderArgs): RootFollowFormantRenderResult {
  const { ctx, entryConfig, quantizeBpm, refs, dynamicRefs, transportAnchor } = args;
  const plan = entryConfig.formantWindowPlan;
  if (!plan || !refs.gainRef.current) {
    return {
      nextSliceStart: args.nextSliceStart,
      sessionAnchorHz: args.sessionAnchorHz,
      delayMs: 24,
    };
  }

  const beatDurationSec = 60 / Math.max(40, quantizeBpm || 108);
  const loopDurationSec = Math.max(0.16, Math.max(0.0625, plan.durationBeats) * beatDurationSec);
  const minStart = Math.max(ctx.currentTime + ROOT_FOLLOW_FORMANT_MIN_LEAD_SEC, transportAnchor);
  const horizon = ctx.currentTime + ROOT_FOLLOW_FORMANT_LEAD_SEC;
  let nextSliceStart = Math.max(args.nextSliceStart, minStart);
  if (nextSliceStart > horizon) {
    return {
      nextSliceStart,
      sessionAnchorHz: args.sessionAnchorHz,
      delayMs: 24,
    };
  }
  if (nextSliceStart < ctx.currentTime - 0.04) {
    nextSliceStart = ctx.currentTime + ROOT_FOLLOW_FORMANT_MIN_LEAD_SEC;
  }

  let sessionAnchorHz = args.sessionAnchorHz;
  const liveRootHz = clamp(dynamicRefs.getCurrentRootHzRef.current(), 27.5, 3520);
  if (!Number.isFinite(sessionAnchorHz ?? NaN) || sessionAnchorHz === null) {
    sessionAnchorHz = Number.isFinite(entryConfig.formantWindowPlan?.rootReferenceHz ?? NaN)
      ? clamp(Number(entryConfig.formantWindowPlan?.rootReferenceHz), 1, 12000)
      : liveRootHz;
  }
  const rootHz = liveRootHz;
  const segmentDuration = ROOT_FOLLOW_FORMANT_SEGMENT_SEC;
  const segmentStart = nextSliceStart;
  const safeBands = plan.bands.slice(0, Math.min(ROOT_FOLLOW_FORMANT_MAX_BANDS, Math.max(1, plan.maxBands || ROOT_FOLLOW_FORMANT_MAX_BANDS)));
  const bandEnergy = safeBands.reduce((sum, band) => sum + Math.max(...band.gainCurve.map((value) => clamp(value, 0, 1)), 0), 0);
  const outputScale = clamp(0.88 / Math.max(0.55, Math.sqrt(Math.max(1, safeBands.length)) + bandEnergy * 0.04), 0.16, 0.62);

  let startedOscillators = 0;
  safeBands.forEach((band, index) => {
    startedOscillators += scheduleFormantBand({
      ctx,
      destination: refs.gainRef.current!,
      refs,
      band,
      bandIndex: index,
      segmentStart,
      segmentDuration,
      transportAnchor,
      loopDurationSec,
      rootHz,
      outputScale,
    });
  });
  const textureSources = scheduleTexture({
    ctx,
    destination: refs.gainRef.current,
    refs,
    plan,
    segmentStart,
    segmentDuration,
    transportAnchor,
    loopDurationSec,
    rootHz,
    outputScale,
  });

  if (startedOscillators > 0) {
    recordAudioPressureCount('scheduled-tone-oscillator', 'oscillator-start', startedOscillators);
  }
  if (textureSources > 0) {
    recordAudioPressureCount('noise-accent-buffer', 'buffer-source-start', textureSources);
  }
  markAudioTrafficEvent(refs.trafficRef?.current, {
    subsystem: 'root-follow',
    kind: 'direct-event-window',
    audioNowSec: ctx.currentTime,
    detail: {
      mode: 'donatello-live-formant',
      bandCount: safeBands.length,
      rootHz,
      loopDurationSec,
      segmentStart,
      segmentDuration,
      outputScale,
      textureSources,
    },
  });

  return {
    nextSliceStart: segmentStart + ROOT_FOLLOW_FORMANT_ADVANCE_SEC,
    sessionAnchorHz,
    delayMs: 24,
  };
}
