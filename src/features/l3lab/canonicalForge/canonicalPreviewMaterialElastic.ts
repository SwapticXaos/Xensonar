import {
  ensureLocalFieldState,
  getLocalFieldTargetState,
  localFieldDynamicFadeGain,
  localFieldPitchSemitoneOffset,
  resolveLocalFieldCurve,
} from './localField';
import type {
  LocalFieldState,
  MaterialElasticPitchInfo,
  NodeRegistrar,
  SchedulingContext,
} from './canonicalPreviewContracts';
import {
  applyMaterialElasticGrainTimeDither,
  makeMaterialElasticWindowSeed,
  materialElasticGrainSourceDitherSec,
} from './materialElasticGrainLattice';
import { recordAudioPressureCount, type AudioPressureSource } from '../../../core/audio/audioPressureMap';

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

const MATERIAL_WINDOW_CURVE = new Float32Array(Array.from({ length: 160 }, (_, index) => {
  const phase = index / 159;
  return phase <= 0 || phase >= 1 ? 0 : Math.max(0, 0.5 - 0.5 * Math.cos(Math.PI * 2 * phase));
}));

const MATERIAL_ELASTIC_MIN_RATE = 0.16;
const MATERIAL_ELASTIC_MAX_RATE = 9.5;
const MATERIAL_ELASTIC_TECH_MIN_RATE = 1 / 256;
const MATERIAL_ELASTIC_TECH_MAX_RATE = 256;

export type MaterialElasticRatePolicy = 'bounded' | 'open-musical';

function sanitizeMaterialElasticRate(value: number, policy: MaterialElasticRatePolicy) {
  const fallback = 1;
  const finite = Number.isFinite(value) && value > 0 ? value : fallback;
  return policy === 'open-musical'
    ? clamp(finite, MATERIAL_ELASTIC_TECH_MIN_RATE, MATERIAL_ELASTIC_TECH_MAX_RATE)
    : clamp(finite, MATERIAL_ELASTIC_MIN_RATE, MATERIAL_ELASTIC_MAX_RATE);
}

export function describeMaterialElasticPitch(args: {
  targetHz: number;
  anchorHz: number;
  minRate?: number;
  maxRate?: number;
  ratePolicy?: MaterialElasticRatePolicy;
}): MaterialElasticPitchInfo {
  const anchorHz = Math.max(1, Number.isFinite(args.anchorHz) ? args.anchorHz : 55);
  const targetHz = Math.max(1, Number.isFinite(args.targetHz) ? args.targetHz : anchorHz);
  const desiredRate = targetHz / anchorHz;
  const ratePolicy = args.ratePolicy ?? 'bounded';
  const playbackRate = ratePolicy === 'open-musical'
    ? sanitizeMaterialElasticRate(desiredRate, ratePolicy)
    : clamp(desiredRate, args.minRate ?? 0.125, args.maxRate ?? 8);
  const elasticRate = ratePolicy === 'open-musical'
    ? sanitizeMaterialElasticRate(playbackRate, ratePolicy)
    : clamp(playbackRate, MATERIAL_ELASTIC_MIN_RATE, MATERIAL_ELASTIC_MAX_RATE);
  const effectiveHz = anchorHz * elasticRate;
  const saturated = Math.abs(elasticRate - desiredRate) > Math.max(0.015, Math.abs(desiredRate) * 0.015);
  return { targetHz, anchorHz, desiredRate, playbackRate, elasticRate, effectiveHz, saturated };
}

export type MaterialElasticGranularTuning = {
  grainWindowScale?: number;
  grainSpacingScale?: number;
  jitterScale?: number;
  sourceDurationScale?: number;
  maxGrains?: number;
  microCutSafety?: boolean;
  microCutSearchRadiusMs?: number;
  sourceStartGuardMs?: number;
  grainTimeDitherMs?: number;
  grainSourceDitherMs?: number;
};


type MaterialMicroCutMap = {
  sampleRate: number;
  durationSec: number;
  hopSamples: number;
  ampAbs: Float32Array;
  slopeAbs: Float32Array;
  energy: Float32Array;
  peakAbs: Float32Array;
};

const materialMicroCutMapCache = new WeakMap<AudioBuffer, MaterialMicroCutMap>();

function mixedBufferSample(buffer: AudioBuffer, sampleIndex: number) {
  const channelCount = Math.max(1, buffer.numberOfChannels || 1);
  const safeIndex = Math.max(0, Math.min(buffer.length - 1, sampleIndex));
  let mixed = 0;
  for (let channel = 0; channel < channelCount; channel += 1) {
    mixed += buffer.getChannelData(channel)[safeIndex] ?? 0;
  }
  return mixed / channelCount;
}

function buildMaterialMicroCutMap(buffer: AudioBuffer): MaterialMicroCutMap {
  const cached = materialMicroCutMapCache.get(buffer);
  if (cached) return cached;
  const sampleRate = Math.max(1, buffer.sampleRate || 44100);
  const hopSamples = Math.max(24, Math.min(128, Math.round(sampleRate * 0.0012)));
  const frameCount = Math.max(1, Math.ceil(buffer.length / hopSamples));
  const ampAbs = new Float32Array(frameCount);
  const slopeAbs = new Float32Array(frameCount);
  const energy = new Float32Array(frameCount);
  const peakAbs = new Float32Array(frameCount);
  const channelCount = Math.max(1, buffer.numberOfChannels || 1);
  let previousSample = 0;
  for (let frame = 0; frame < frameCount; frame += 1) {
    const center = Math.min(buffer.length - 1, frame * hopSamples);
    let mixed = 0;
    let rmsSum = 0;
    let rmsCount = 0;
    let peak = 0;
    const radius = Math.max(12, Math.min(96, Math.floor(hopSamples * 0.85)));
    const left = Math.max(0, center - radius);
    const right = Math.min(buffer.length - 1, center + radius);
    for (let channel = 0; channel < channelCount; channel += 1) {
      const data = buffer.getChannelData(channel);
      mixed += data[center] ?? 0;
      for (let i = left; i <= right; i += 1) {
        const sample = data[i] ?? 0;
        const abs = Math.abs(sample);
        rmsSum += sample * sample;
        peak = Math.max(peak, abs);
        rmsCount += 1;
      }
    }
    mixed /= channelCount;
    ampAbs[frame] = Math.abs(mixed);
    slopeAbs[frame] = Math.abs(mixed - previousSample);
    energy[frame] = Math.sqrt(rmsSum / Math.max(1, rmsCount));
    peakAbs[frame] = peak;
    previousSample = mixed;
  }
  const map = { sampleRate, durationSec: buffer.duration, hopSamples, ampAbs, slopeAbs, energy, peakAbs };
  materialMicroCutMapCache.set(buffer, map);
  return map;
}

function normalizeMapScore(value: number, scale: number) {
  return 1 - clamp(Math.abs(value) / Math.max(0.0001, scale), 0, 1);
}

function microCutFrameScore(map: MaterialMicroCutMap, frame: number, requestedFrame: number, radiusFrames: number) {
  const distanceRatio = Math.abs(frame - requestedFrame) / Math.max(1, radiusFrames);
  const zeroCrossingScore = normalizeMapScore(map.ampAbs[frame] ?? 0, 0.055);
  const lowEnergyScore = normalizeMapScore(map.energy[frame] ?? 0, 0.13);
  const lowPeakScore = normalizeMapScore(map.peakAbs[frame] ?? 0, 0.24);
  const lowSlopeScore = normalizeMapScore(map.slopeAbs[frame] ?? 0, 0.08);
  const proximityScore = 1 - clamp(distanceRatio, 0, 1);
  return zeroCrossingScore * 0.34
    + lowEnergyScore * 0.21
    + lowPeakScore * 0.12
    + lowSlopeScore * 0.18
    + proximityScore * 0.15;
}

function samplePreciseMicroCutScore(buffer: AudioBuffer, sampleIndex: number, requestedSample: number, radiusSamples: number) {
  const sample = mixedBufferSample(buffer, sampleIndex);
  const prev = mixedBufferSample(buffer, Math.max(0, sampleIndex - 1));
  const next = mixedBufferSample(buffer, Math.min(buffer.length - 1, sampleIndex + 1));
  const slope = Math.abs(next - prev) * 0.5;
  const localRadius = Math.max(6, Math.min(96, Math.round(buffer.sampleRate * 0.00075)));
  let rms = 0;
  let peak = 0;
  let count = 0;
  const left = Math.max(0, sampleIndex - localRadius);
  const right = Math.min(buffer.length - 1, sampleIndex + localRadius);
  for (let i = left; i <= right; i += Math.max(1, Math.floor(localRadius / 12))) {
    const v = mixedBufferSample(buffer, i);
    rms += v * v;
    peak = Math.max(peak, Math.abs(v));
    count += 1;
  }
  const zeroCrossingBonus = (prev <= 0 && next >= 0) || (prev >= 0 && next <= 0) ? 0.16 : 0;
  const distanceRatio = Math.abs(sampleIndex - requestedSample) / Math.max(1, radiusSamples);
  return normalizeMapScore(sample, 0.035) * 0.31
    + normalizeMapScore(Math.sqrt(rms / Math.max(1, count)), 0.12) * 0.18
    + normalizeMapScore(peak, 0.22) * 0.11
    + normalizeMapScore(slope, 0.055) * 0.19
    + (1 - clamp(distanceRatio, 0, 1)) * 0.15
    + zeroCrossingBonus;
}

export function snapMaterialElasticSourceStartToMicroCut(args: {
  buffer: AudioBuffer;
  requestedSec: number;
  minSec: number;
  maxSec: number;
  searchRadiusSec?: number;
}) {
  const buffer = args.buffer;
  const minSec = clamp(args.minSec, 0, Math.max(0, buffer.duration - 0.001));
  const maxSec = clamp(args.maxSec, minSec, Math.max(minSec, buffer.duration - 0.001));
  const requestedSec = clamp(args.requestedSec, minSec, maxSec);
  const radiusSec = clamp(args.searchRadiusSec ?? 0.005, 0, 0.014);
  if (radiusSec <= 0.0005 || maxSec - minSec <= 0.0005) return requestedSec;
  const map = buildMaterialMicroCutMap(buffer);
  const hopSec = map.hopSamples / map.sampleRate;
  const requestedFrame = Math.round(requestedSec / hopSec);
  const startFrame = Math.max(0, Math.floor(Math.max(minSec, requestedSec - radiusSec) / hopSec));
  const endFrame = Math.min(map.ampAbs.length - 1, Math.ceil(Math.min(maxSec, requestedSec + radiusSec) / hopSec));
  if (endFrame <= startFrame) return requestedSec;
  let coarseFrame = requestedFrame;
  let coarseScore = -Infinity;
  const radiusFrames = Math.max(1, Math.ceil(radiusSec / hopSec));
  for (let frame = startFrame; frame <= endFrame; frame += 1) {
    const score = microCutFrameScore(map, frame, requestedFrame, radiusFrames);
    if (score > coarseScore) {
      coarseScore = score;
      coarseFrame = frame;
    }
  }

  const sampleRate = Math.max(1, buffer.sampleRate || 44100);
  const requestedSample = Math.round(requestedSec * sampleRate);
  const coarseSample = coarseFrame * map.hopSamples;
  const minSample = Math.max(0, Math.ceil(minSec * sampleRate));
  const maxSample = Math.min(buffer.length - 2, Math.floor(maxSec * sampleRate));
  const preciseRadiusSamples = Math.max(16, Math.min(Math.round(radiusSec * sampleRate), Math.round(sampleRate * 0.0045)));
  const preciseStart = Math.max(minSample, coarseSample - preciseRadiusSamples);
  const preciseEnd = Math.min(maxSample, coarseSample + preciseRadiusSamples);
  if (preciseEnd <= preciseStart) return clamp(coarseFrame * hopSec, minSec, maxSec);

  let bestSample = Math.max(preciseStart, Math.min(preciseEnd, coarseSample));
  let bestScore = -Infinity;
  const step = Math.max(1, Math.floor(sampleRate / 12000));
  for (let sampleIndex = preciseStart; sampleIndex <= preciseEnd; sampleIndex += step) {
    const score = samplePreciseMicroCutScore(buffer, sampleIndex, requestedSample, Math.max(1, preciseRadiusSamples));
    if (score > bestScore) {
      bestScore = score;
      bestSample = sampleIndex;
    }
  }
  return clamp(bestSample / sampleRate, minSec, maxSec);
}

function guardedMaterialElasticWhen(args: {
  noteStart: number;
  noteEnd: number;
  nominalDur: number;
  scheduleSpacing: number;
  index: number;
  tuning?: MaterialElasticGranularTuning | null;
}) {
  const baseWhen = args.noteStart + Math.min(args.nominalDur, args.index * args.scheduleSpacing);
  const guardSec = clamp((args.tuning?.sourceStartGuardMs ?? 0) / 1000, 0, 0.008);
  if (guardSec <= 0.0002 || args.index !== 0) return baseWhen;
  const shifted = baseWhen + Math.min(guardSec, Math.max(0, args.scheduleSpacing * 0.45));
  return Math.min(shifted, args.noteEnd - 0.004);
}

function materialElasticSettings(playbackRate: number, nominalDur: number, quality: 'base' | 'fragment', tuning?: MaterialElasticGranularTuning | null, ratePolicy: MaterialElasticRatePolicy = 'bounded') {
  const safeRate = sanitizeMaterialElasticRate(playbackRate, ratePolicy);
  const pitchStretch = Math.abs(Math.log2(Math.max(0.0001, safeRate)));
  const isFragment = quality === 'fragment';
  const baseWindow = isFragment ? 0.078 : 0.104;
  const dynamicShrink = isFragment ? 0.009 : 0.007;
  const dynamicGrow = pitchStretch > 1.25 ? (pitchStretch - 1.25) * (isFragment ? 0.006 : 0.004) : 0;
  const grainWindowScale = clamp(tuning?.grainWindowScale ?? 1, 0.48, 1.8);
  const grainSpacingScale = clamp(tuning?.grainSpacingScale ?? 1, 0.25, 2.4);
  const jitterScale = clamp(tuning?.jitterScale ?? 1, 0, 3.5);
  const grainDurOut = clamp(
    (baseWindow - pitchStretch * dynamicShrink + dynamicGrow + nominalDur * (isFragment ? 0.092 : 0.104)) * grainWindowScale,
    (isFragment ? 0.05 : 0.07) * Math.min(1, grainWindowScale),
    (isFragment ? 0.165 : 0.19) * Math.max(1, grainWindowScale),
  );
  const overlapRatio = clamp(isFragment ? 0.885 : 0.905, 0.82, 0.95);
  const grainSpacing = Math.max(0.003, grainDurOut * (1 - overlapRatio) * grainSpacingScale);
  const jitterRatio = (isFragment ? 0.008 : 0.003) * jitterScale;
  return { safeRate, grainDurOut, grainSpacing, jitterRatio };
}

export type MaterialElasticGrainPlan = {
  index: number;
  when: number;
  srcStart: number;
  actualGrainOut: number;
  bufferDurationArg: number;
};

export type MaterialElasticSlicePlan = {
  safeRate: number;
  grainDurOut: number;
  grainSpacing: number;
  jitterRatio: number;
  rawGrainCount: number;
  maxGrains: number;
  grainCount: number;
  scheduleSpacing: number;
  usableSlice: number;
  srcGrainDur: number;
  sourceStartSec: number;
  sourceEndSec: number;
  lateSkippedGrains: number;
  grains: MaterialElasticGrainPlan[];
};

export function buildMaterialElasticSlicePlan(args: {
  buffer: AudioBuffer;
  currentTime: number;
  noteStart: number;
  noteEnd: number;
  nominalDur: number;
  safeOffsetSec: number;
  sliceDurationSec: number;
  playbackRate: number;
  quality: 'base' | 'fragment';
  tuning?: MaterialElasticGranularTuning | null;
  minimumScheduleLeadSec?: number;
  ratePolicy?: MaterialElasticRatePolicy;
}): MaterialElasticSlicePlan {
  const { buffer, noteStart, noteEnd, nominalDur, safeOffsetSec, sliceDurationSec, playbackRate, quality } = args;
  const { safeRate, grainDurOut, grainSpacing, jitterRatio } = materialElasticSettings(
    playbackRate,
    nominalDur,
    quality,
    args.tuning,
    args.ratePolicy ?? 'bounded',
  );
  const rawGrainCount = Math.max(1, Math.ceil(Math.max(0.001, nominalDur) / grainSpacing));
  const maxGrains = Math.max(1, Math.round(args.tuning?.maxGrains ?? rawGrainCount));
  const grainCount = Math.min(rawGrainCount, maxGrains);
  const scheduleSpacing = rawGrainCount > maxGrains
    ? Math.max(0.003, Math.max(0.001, nominalDur) / Math.max(1, grainCount))
    : grainSpacing;
  const sourceDurationScale = clamp(args.tuning?.sourceDurationScale ?? 1, 0.45, 2.4);
  const usableSlice = Math.max(
    0.008,
    Math.min(sliceDurationSec * sourceDurationScale, Math.max(0.008, buffer.duration - safeOffsetSec)),
  );
  const srcGrainDur = Math.max(0.012, Math.min(usableSlice, grainDurOut * safeRate * 1.18));
  const maxSrcStart = Math.max(safeOffsetSec, safeOffsetSec + usableSlice - srcGrainDur);
  const srcTravel = Math.max(0, maxSrcStart - safeOffsetSec);
  const minimumScheduleLeadSec = Math.max(0, Math.min(0.032, args.minimumScheduleLeadSec ?? 0));
  const microCutSearchRadiusSec = (args.tuning?.microCutSearchRadiusMs ?? (quality === 'fragment' ? 4 : 6)) / 1000;
  const windowSeed = makeMaterialElasticWindowSeed({
    eventStartSec: noteStart,
    sourceStartSec: safeOffsetSec,
    playbackRate: safeRate,
    quality,
  });
  const grains: MaterialElasticGrainPlan[] = [];
  let lateSkippedGrains = 0;
  for (let index = 0; index < grainCount; index += 1) {
    const progress = grainCount <= 1 ? 0 : index / Math.max(1, grainCount - 1);
    const guardedWhen = guardedMaterialElasticWhen({
      noteStart,
      noteEnd,
      nominalDur,
      scheduleSpacing,
      index,
      tuning: args.tuning,
    });
    const when = applyMaterialElasticGrainTimeDither({
      baseWhenSec: guardedWhen,
      eventStartSec: noteStart,
      eventEndSec: noteEnd,
      seed: windowSeed,
      index,
      scheduleSpacingSec: scheduleSpacing,
      grainDurationSec: grainDurOut,
      tuning: args.tuning,
    });
    if (when >= noteEnd - 0.003) break;
    if (minimumScheduleLeadSec > 0 && when < args.currentTime + minimumScheduleLeadSec) {
      lateSkippedGrains += 1;
      continue;
    }
    const latticeSourceDither = materialElasticGrainSourceDitherSec({
      seed: windowSeed,
      index,
      searchRadiusSec: microCutSearchRadiusSec,
      sourceGrainDurationSec: srcGrainDur,
      tuning: args.tuning,
    });
    const jitter = Math.sin((index + 1) * 1.618 + windowSeed * 0.00037) * srcGrainDur * jitterRatio;
    const requestedSrcStart = clamp(
      safeOffsetSec + srcTravel * progress + jitter + latticeSourceDither,
      safeOffsetSec,
      maxSrcStart,
    );
    const srcStart = args.tuning?.microCutSafety
      ? snapMaterialElasticSourceStartToMicroCut({
          buffer,
          requestedSec: requestedSrcStart,
          minSec: safeOffsetSec,
          maxSec: maxSrcStart,
          searchRadiusSec: microCutSearchRadiusSec,
        })
      : requestedSrcStart;
    const actualGrainOut = Math.max(0.012, Math.min(grainDurOut, noteEnd - when));
    const bufferDurationArg = Math.max(
      0.012,
      Math.min(buffer.duration - srcStart, actualGrainOut * safeRate * 1.1),
    );
    grains.push({ index, when, srcStart, actualGrainOut, bufferDurationArg });
  }
  return {
    safeRate,
    grainDurOut,
    grainSpacing,
    jitterRatio,
    rawGrainCount,
    maxGrains,
    grainCount: grains.length,
    scheduleSpacing,
    usableSlice,
    srcGrainDur,
    sourceStartSec: safeOffsetSec,
    sourceEndSec: Math.min(buffer.duration, safeOffsetSec + usableSlice),
    lateSkippedGrains,
    grains,
  };
}

export function executeMaterialElasticSlicePlan(args: {
  ctx: SchedulingContext;
  destination: GainNode;
  buffer: AudioBuffer;
  plan: MaterialElasticSlicePlan;
  noteEnd: number;
  registerNode?: NodeRegistrar;
  pressureSource?: AudioPressureSource;
}) {
  const { ctx, destination, buffer, plan, noteEnd } = args;
  let actualStartedGrains = 0;
  for (const grain of plan.grains) {
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.setValueAtTime(plan.safeRate, grain.when);
    const grainGain = ctx.createGain();
    grainGain.gain.setValueCurveAtTime(MATERIAL_WINDOW_CURVE, grain.when, grain.actualGrainOut);
    source.connect(grainGain);
    grainGain.connect(destination);
    source.start(grain.when, grain.srcStart, grain.bufferDurationArg);
    source.stop(Math.min(noteEnd + 0.03, grain.when + grain.actualGrainOut + 0.02));
    args.registerNode?.(source);
    args.registerNode?.(grainGain);
    actualStartedGrains += 1;
  }
  if (args.pressureSource && actualStartedGrains > 0) {
    recordAudioPressureCount(args.pressureSource, 'buffer-source-start', actualStartedGrains);
    recordAudioPressureCount(args.pressureSource, 'gain-node-create', actualStartedGrains);
  }
  if (args.pressureSource && plan.lateSkippedGrains > 0) {
    recordAudioPressureCount(args.pressureSource, 'late-grain-dropped', plan.lateSkippedGrains);
  }
}

export function scheduleMaterialElasticSlice(args: {
  ctx: SchedulingContext;
  destination: GainNode;
  buffer: AudioBuffer;
  noteStart: number;
  noteEnd: number;
  nominalDur: number;
  safeOffsetSec: number;
  sliceDurationSec: number;
  playbackRate: number;
  quality: 'base' | 'fragment';
  tuning?: MaterialElasticGranularTuning | null;
  registerNode?: NodeRegistrar;
  pressureSource?: AudioPressureSource;
  minimumScheduleLeadSec?: number;
  ratePolicy?: MaterialElasticRatePolicy;
}) {
  const plan = buildMaterialElasticSlicePlan({
    buffer: args.buffer,
    currentTime: args.ctx.currentTime,
    noteStart: args.noteStart,
    noteEnd: args.noteEnd,
    nominalDur: args.nominalDur,
    safeOffsetSec: args.safeOffsetSec,
    sliceDurationSec: args.sliceDurationSec,
    playbackRate: args.playbackRate,
    quality: args.quality,
    tuning: args.tuning,
    minimumScheduleLeadSec: args.minimumScheduleLeadSec,
    ratePolicy: args.ratePolicy,
  });
  executeMaterialElasticSlicePlan({
    ctx: args.ctx,
    destination: args.destination,
    buffer: args.buffer,
    plan,
    noteEnd: args.noteEnd,
    registerNode: args.registerNode,
    pressureSource: args.pressureSource,
  });
}

function sampleLinear(source: number[], position: number) {
  if (!source.length) return 0;
  const safePos = clamp(position, 0, Math.max(0, source.length - 1));
  const left = Math.floor(safePos);
  const right = Math.min(source.length - 1, left + 1);
  const mix = safePos - left;
  return (source[left] ?? 0) * (1 - mix) + (source[right] ?? 0) * mix;
}

function sampleLocalFieldValue(field: LocalFieldState, progressRatio: number, resolvedCurve: number[]) {
  if (!resolvedCurve.length) return 0;
  const safeProgress = clamp(progressRatio, 0, 1);
  const start = clamp(field.range.startRatio, 0, 1);
  const end = clamp(field.range.endRatio, 0, 1);
  // The field range is the time span in which the drawn curve is traversed.
  // Outside that span the outer triangle handles remain musically authoritative:
  // the left handle is held before the curve starts, and the right handle is held
  // after the curve ends. Returning neutral (0) here made dynamic-fade curves jump
  // back to unity gain at the tail, even when the visible right triangle was low.
  if (safeProgress <= start) return resolvedCurve[0] ?? 0;
  if (safeProgress >= end) return resolvedCurve[resolvedCurve.length - 1] ?? 0;
  const span = Math.max(0.0001, end - start);
  const localRatio = clamp((safeProgress - start) / span, 0, 1);
  return sampleLinear(resolvedCurve, localRatio * Math.max(0, resolvedCurve.length - 1));
}

export function scheduleLocalFieldElasticPitchSlice(args: {
  ctx: SchedulingContext;
  destination: AudioNode;
  buffer: AudioBuffer;
  noteStart: number;
  noteEnd: number;
  nominalDur: number;
  safeOffsetSec: number;
  sliceDurationSec: number;
  basePlaybackRate: number;
  fields: LocalFieldState[];
  quality: 'base' | 'fragment';
  registerNode?: NodeRegistrar;
  pressureSource?: AudioPressureSource;
  ratePolicy?: MaterialElasticRatePolicy;
}) {
  const { ctx, destination, buffer, noteStart, noteEnd, nominalDur, safeOffsetSec, sliceDurationSec, basePlaybackRate, fields, quality } = args;
  const registerNode = args.registerNode ?? null;
  const ratePolicy = args.ratePolicy ?? 'bounded';
  const { safeRate, grainDurOut, grainSpacing, jitterRatio } = materialElasticSettings(basePlaybackRate, nominalDur, quality, undefined, ratePolicy);
  const grainCount = Math.max(12, Math.ceil(nominalDur / Math.max(0.012, grainSpacing)));
  const maxSrcStart = Math.max(safeOffsetSec, safeOffsetSec + sliceDurationSec - Math.max(0.02, grainDurOut * safeRate * 1.4));
  const srcTravel = Math.max(0, maxSrcStart - safeOffsetSec);
  const resolvedCurves = fields.map((field) => ({ field, curve: resolveLocalFieldCurve(field, 144).resolved }));
  for (let index = 0; index < grainCount; index += 1) {
    const progress = grainCount <= 1 ? 0 : index / Math.max(1, grainCount - 1);
    const when = noteStart + Math.min(nominalDur, index * grainSpacing);
    if (when >= noteEnd - 0.003) break;
    let semitoneOffset = 0;
    resolvedCurves.forEach(({ field, curve }) => {
      semitoneOffset += localFieldPitchSemitoneOffset(sampleLocalFieldValue(field, progress, curve));
    });
    const localRate = basePlaybackRate * Math.pow(2, semitoneOffset / 12);
    const elasticRate = ratePolicy === 'open-musical'
      ? sanitizeMaterialElasticRate(localRate, ratePolicy)
      : clamp(localRate, MATERIAL_ELASTIC_MIN_RATE, MATERIAL_ELASTIC_MAX_RATE);
    const jitter = Math.sin((index + 1) * 1.618) * grainDurOut * elasticRate * jitterRatio;
    const requestedSrcStart = clamp(safeOffsetSec + srcTravel * progress + jitter, safeOffsetSec, maxSrcStart);
    const srcStart = snapMaterialElasticSourceStartToMicroCut({
      buffer,
      requestedSec: requestedSrcStart,
      minSec: safeOffsetSec,
      maxSec: maxSrcStart,
      searchRadiusSec: quality === 'fragment' ? 0.004 : 0.006,
    });
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.setValueAtTime(elasticRate, when);
    const grainGain = ctx.createGain();
    const actualGrainOut = Math.max(0.012, Math.min(grainDurOut, noteEnd - when));
    grainGain.gain.setValueCurveAtTime(MATERIAL_WINDOW_CURVE, when, actualGrainOut);
    source.connect(grainGain);
    grainGain.connect(destination);
    const bufferDurationArg = Math.max(0.012, Math.min(buffer.duration - srcStart, actualGrainOut * elasticRate * 1.15));
    source.start(when, srcStart, bufferDurationArg);
    source.stop(Math.min(noteEnd + 0.03, when + actualGrainOut + 0.02));
    registerNode?.(source);
    registerNode?.(grainGain);
  }
}

export function scheduleDynamicFieldGainAutomation(
  gainNode: GainNode,
  fieldInputs: Array<LocalFieldState | null | undefined>,
  noteStart: number,
  nominalDur: number,
  noteEnd: number,
) {
  const activeFields = fieldInputs
    .map((field) => (field ? getLocalFieldTargetState(ensureLocalFieldState(field), 'dynamic-fade') : null))
    .filter((field): field is LocalFieldState => !!field && field.enabled && !field.bypassed);
  if (!activeFields.length) return;
  const duration = Math.max(0.01, nominalDur);
  const curveCount = 128;
  const resolved = activeFields.map((field) => ({ field, curve: resolveLocalFieldCurve(field, curveCount).resolved }));
  const mapped = new Float32Array(curveCount);
  for (let index = 0; index < curveCount; index += 1) {
    const progress = curveCount <= 1 ? 0 : index / Math.max(1, curveCount - 1);
    let gain = 1;
    resolved.forEach(({ field, curve }) => {
      gain *= localFieldDynamicFadeGain(sampleLocalFieldValue(field, progress, curve));
    });
    mapped[index] = gain;
  }
  const firstGain = mapped[0] ?? 1;
  const finalGain = mapped[mapped.length - 1] ?? firstGain;
  gainNode.gain.setValueAtTime(firstGain, noteStart);
  gainNode.gain.setValueCurveAtTime(mapped, noteStart, duration);
  gainNode.gain.setValueAtTime(finalGain, noteStart + nominalDur);
  gainNode.gain.setValueAtTime(finalGain, noteEnd);
}
