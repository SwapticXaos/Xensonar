// Xensonar 3.2.91.7.5.98
// Strange Attractor · Schwarmkörper — Carrier plan builder.
//
// The builder creates a deterministic synthetic interpretation plan from Carrier
// descriptors/windows. It does not create AudioNodes, render audio, navigate the
// UI, or write into Synthetic Forge / Melodic Loop.

import type { SpectralData } from '../audio/SpectralData';
import { extractCarrierDescriptorFromSpectralData } from './carrierDescriptorShadowProbe';
import type { CarrierColumnMeasure, CarrierDescriptor } from './carrierDescriptorContract';
import { createStrangeAttractorSeededRandom, hashStrangeAttractorSeed } from './carrierStrangeAttractorSeededRandom';
import {
  STRANGE_ATTRACTOR_CARRIER_MACHINE_ID,
  STRANGE_ATTRACTOR_CARRIER_PLAN_VERSION,
  type StrangeAttractorAmpShape,
  type StrangeAttractorCarrieroughnessCurves,
  type StrangeAttractorCarrierInput,
  type StrangeAttractorCarrierOptions,
  type StrangeAttractorCarrierPlan,
  type StrangeAttractorCarrierWindowInput,
  type StrangeAttractorDronePlan,
  type StrangeAttractorFamilyBias,
  type StrangeAttractorNodePlan,
  type StrangeAttractorSwarmEvent,
  type StrangeAttractorSwarmFamily,
} from './carrierStrangeAttractorTypes';

const DEFAULT_DURATION_SEC = 8;
const DEFAULT_ROOT_HZ = 220;
const DEFAULT_MIN_HZ = 55;
const DEFAULT_MAX_HZ = 880;
const DEFAULT_MAX_ATTRACTORS = 48;
const DEFAULT_MAX_SWARM_EVENTS = 320;
const EPSILON = 1e-9;

type NormalizedWindow = Required<StrangeAttractorCarrierWindowInput> & {
  readonly index: number;
  readonly x: number;
  readonly y: number;
};

type MutableFamilyBias = Record<StrangeAttractorSwarmFamily, number>;

export function buildStrangeAttractorCarrierPlan(
  input: StrangeAttractorCarrierInput,
  options: StrangeAttractorCarrierOptions = {},
): StrangeAttractorCarrierPlan {
  const durationSec = sanitizePositive(input.durationSec, DEFAULT_DURATION_SEC);
  const minHz = sanitizePositive(options.minHz, DEFAULT_MIN_HZ);
  const maxHz = Math.max(minHz * 1.25, sanitizePositive(options.maxHz, DEFAULT_MAX_HZ));
  const rootHz = clampHz(sanitizePositive(input.rootHz, DEFAULT_ROOT_HZ), minHz, maxHz);
  const tuning = options.tuning ?? 'free';
  const maxAttractors = clampInteger(options.maxAttractors ?? DEFAULT_MAX_ATTRACTORS, 1, 256);
  const maxSwarmEvents = clampInteger(options.maxSwarmEvents ?? DEFAULT_MAX_SWARM_EVENTS, 1, 4096);
  const seed = hashStrangeAttractorSeed(
    options.seed ?? `${input.sourceCarrierId ?? 'carrier'}:${durationSec}:${rootHz}:${tuning}:${input.windows.length}`,
  );
  const rng = createStrangeAttractorSeededRandom(seed);
  const windows = normalizeCarrierWindows(input.windows, durationSec, rootHz, minHz, maxHz);
  const attractors = buildAttractorsFromWindows({
    windows,
    maxAttractors,
    minHz,
    maxHz,
  });
  const { events: swarmEvents, rejectedEventCount } = buildSwarmEventsFromAttractors({
    attractors,
    rng,
    maxSwarmEvents,
    minHz,
    maxHz,
  });
  const curves = buildCarrieroughnessCurves(windows, durationSec);
  const drone = buildDronePlan({
    windows,
    durationSec,
    rootHz,
    minHz,
    maxHz,
  });

  return {
    version: STRANGE_ATTRACTOR_CARRIER_PLAN_VERSION,
    machineId: STRANGE_ATTRACTOR_CARRIER_MACHINE_ID,
    sourceCarrierId: input.sourceCarrierId,
    durationSec,
    rootHz,
    tuning,
    drone,
    attractors,
    swarmEvents,
    curves,
    summary: summarizePlan(windows, attractors, swarmEvents),
    debug: {
      seed,
      sourceWindowCount: input.windows.length,
      rejectedEventCount,
      quantizationMode: tuning,
    },
  };
}

export function buildStrangeAttractorCarrierPlanFromDescriptor(
  descriptor: CarrierDescriptor,
  options: StrangeAttractorCarrierOptions & {
    readonly sourceCarrierId?: string;
    readonly durationSec?: number;
    readonly rootHz?: number;
  } = {},
): StrangeAttractorCarrierPlan {
  return buildStrangeAttractorCarrierPlan(
    buildStrangeAttractorCarrierInputFromDescriptor(descriptor, {
      sourceCarrierId: options.sourceCarrierId,
      durationSec: options.durationSec,
      rootHz: options.rootHz,
    }),
    options,
  );
}

export function buildStrangeAttractorCarrierInputFromDescriptor(
  descriptor: CarrierDescriptor,
  args: {
    readonly sourceCarrierId?: string;
    readonly durationSec?: number;
    readonly rootHz?: number;
  } = {},
): StrangeAttractorCarrierInput {
  const columns = descriptor.measure.columns;
  const durationSec = sanitizePositive(args.durationSec, inferDurationFromColumnCount(columns.length));
  const windows = columns
    .filter((column) => column.meanEnergy > 0 || column.peakEnergy > 0)
    .map((column) => buildWindowFromColumn(column, columns.length, durationSec));
  return {
    sourceCarrierId: args.sourceCarrierId,
    durationSec,
    rootHz: args.rootHz,
    windows,
  };
}

export function buildStrangeAttractorCarrierPlanFromSpectralData(
  spectralData: SpectralData,
  options: StrangeAttractorCarrierOptions & {
    readonly sourceCarrierId?: string;
    readonly durationSec?: number;
    readonly rootHz?: number;
  } = {},
): StrangeAttractorCarrierPlan {
  const descriptor = extractCarrierDescriptorFromSpectralData(spectralData, { includeHints: true });
  return buildStrangeAttractorCarrierPlanFromDescriptor(descriptor, options);
}

export function buildStrangeAttractorCarrierFixturePlan(
  options: StrangeAttractorCarrierOptions = {},
): StrangeAttractorCarrierPlan {
  const durationSec = 7.5;
  const windows: StrangeAttractorCarrierWindowInput[] = [];
  for (let index = 0; index < 40; index += 1) {
    const ratio = index / 39;
    const arc = Math.sin(ratio * Math.PI * 2);
    const fold = Math.sin(ratio * Math.PI * 6 + 0.35);
    windows.push({
      t0: ratio * durationSec,
      t1: Math.min(durationSec, ratio * durationSec + durationSec / 28),
      centerHz: 110 * Math.pow(2, 1.55 + arc * 0.42 + fold * 0.08),
      energy: clamp01(0.42 + 0.35 * Math.max(0, arc) + 0.15 * Math.abs(fold)),
      density: clamp01(0.25 + 0.45 * Math.abs(fold)),
      bandwidth: clamp01(0.12 + 0.4 * Math.abs(Math.sin(ratio * Math.PI * 4))),
      roughness: clamp01(0.16 + 0.55 * Math.max(0, -fold)),
      presence: clamp01(0.35 + 0.35 * Math.max(0, arc)),
      continuity: clamp01(0.68 - 0.32 * Math.abs(fold)),
    });
  }
  return buildStrangeAttractorCarrierPlan(
    {
      sourceCarrierId: 'fixture-strange-attractor-schwarmkoerper',
      durationSec,
      rootHz: 220,
      windows,
    },
    { seed: 'fixture-strange-attractor-schwarmkoerper', ...options },
  );
}

function buildWindowFromColumn(
  column: CarrierColumnMeasure,
  columnCount: number,
  durationSec: number,
): StrangeAttractorCarrierWindowInput {
  const t0 = column.timeRatio * durationSec;
  const t1 = Math.min(durationSec, t0 + durationSec / Math.max(1, columnCount));
  const centroid = column.centroid ?? inferCentroidFromBands(column);
  const spread = column.spread ?? 0.08;
  const lowHighImbalance = Math.abs(column.highBandEnergy - column.lowBandEnergy);
  const bandSum = column.lowBandEnergy + column.midBandEnergy + column.highBandEnergy;
  return {
    t0,
    t1,
    centerHz: normalizedYToHz(centroid, DEFAULT_MIN_HZ, DEFAULT_MAX_HZ),
    energy: clamp01(column.peakEnergy * 0.64 + column.meanEnergy * 0.36),
    density: clamp01(column.meanEnergy * 0.65 + column.peakEnergy * 0.25 + bandSum * 0.1),
    bandwidth: clamp01(spread * 1.8),
    roughness: clamp01(spread * 0.8 + lowHighImbalance * 0.45),
    presence: clamp01(column.midBandEnergy * 0.45 + column.highBandEnergy * 0.45 + column.peakEnergy * 0.1),
    continuity: clamp01(1 - spread * 1.2 - lowHighImbalance * 0.25 + column.meanEnergy * 0.2),
  };
}

function normalizeCarrierWindows(
  inputWindows: readonly StrangeAttractorCarrierWindowInput[],
  durationSec: number,
  rootHz: number,
  minHz: number,
  maxHz: number,
): readonly NormalizedWindow[] {
  const valid = inputWindows
    .map((windowInput, index) => normalizeWindow(windowInput, index, durationSec, rootHz, minHz, maxHz))
    .filter((windowInput): windowInput is NormalizedWindow => windowInput !== null)
    .sort((a, b) => a.t0 - b.t0 || a.centerHz - b.centerHz);
  if (valid.length > 0) return valid;
  return [
    {
      index: 0,
      t0: 0,
      t1: durationSec,
      centerHz: rootHz,
      energy: 0.25,
      density: 0.1,
      bandwidth: 0.08,
      roughness: 0.05,
      presence: 0.25,
      continuity: 0.8,
      x: 0.5,
      y: hzToNormalizedY(rootHz, minHz, maxHz),
    },
  ];
}

function normalizeWindow(
  windowInput: StrangeAttractorCarrierWindowInput,
  index: number,
  durationSec: number,
  rootHz: number,
  minHz: number,
  maxHz: number,
): NormalizedWindow | null {
  const t0 = clamp(windowInput.t0, 0, durationSec);
  const t1 = clamp(windowInput.t1, t0 + 0.012, durationSec);
  if (t1 <= t0 + EPSILON) return null;
  const centerHz = clampHz(sanitizePositive(windowInput.centerHz, rootHz), minHz, maxHz);
  return {
    index,
    t0,
    t1,
    centerHz,
    energy: clamp01(windowInput.energy ?? 0),
    density: clamp01(windowInput.density ?? windowInput.energy ?? 0),
    bandwidth: clamp01(windowInput.bandwidth ?? 0.08),
    roughness: clamp01(windowInput.roughness ?? 0),
    presence: clamp01(windowInput.presence ?? windowInput.energy ?? 0),
    continuity: clamp01(windowInput.continuity ?? 0.5),
    x: durationSec <= EPSILON ? 0 : clamp01((t0 + t1) * 0.5 / durationSec),
    y: hzToNormalizedY(centerHz, minHz, maxHz),
  };
}

function buildAttractorsFromWindows(args: {
  readonly windows: readonly NormalizedWindow[];
  readonly maxAttractors: number;
  readonly minHz: number;
  readonly maxHz: number;
}): readonly StrangeAttractorNodePlan[] {
  const { maxAttractors, maxHz, minHz, windows } = args;
  if (windows.length === 0) return [];
  const stride = Math.max(1, Math.ceil(windows.length / maxAttractors));
  const attractors: StrangeAttractorNodePlan[] = [];
  for (let start = 0; start < windows.length; start += stride) {
    const group = windows.slice(start, start + stride);
    const weightSum = group.reduce((sum, item) => sum + 0.2 + item.energy + item.density, 0);
    const weighted = (selector: (item: NormalizedWindow) => number): number =>
      group.reduce((sum, item) => sum + selector(item) * (0.2 + item.energy + item.density), 0) / Math.max(EPSILON, weightSum);
    const t0 = Math.min(...group.map((item) => item.t0));
    const t1 = Math.max(...group.map((item) => item.t1));
    const x = weighted((item) => item.x);
    const y = weighted((item) => item.y);
    const energy = weighted((item) => item.energy);
    const density = weighted((item) => item.density);
    const bandwidth = weighted((item) => item.bandwidth);
    const roughness = weighted((item) => item.roughness);
    const presence = weighted((item) => item.presence);
    const continuity = weighted((item) => item.continuity);
    attractors.push({
      id: `sa-attractor-${String(attractors.length + 1).padStart(3, '0')}`,
      t0,
      t1,
      x: clamp01(x),
      y: clamp01(y),
      hz: clampHz(weighted((item) => item.centerHz), minHz, maxHz),
      strength: clamp01(energy * 0.68 + density * 0.22 + presence * 0.1),
      radius: clamp01(0.08 + bandwidth * 0.6 + density * 0.18),
      familyBias: normalizeFamilyBias({
        drift: continuity * 0.62 + (1 - roughness) * 0.22 + energy * 0.08,
        orbit: continuity * 0.5 + presence * 0.22 + (1 - bandwidth) * 0.16,
        spray: roughness * 0.72 + density * 0.2 + (1 - continuity) * 0.22,
        cluster: energy * 0.36 + bandwidth * 0.34 + roughness * 0.22 + presence * 0.12,
      }),
    });
  }
  return attractors;
}

function buildSwarmEventsFromAttractors(args: {
  readonly attractors: readonly StrangeAttractorNodePlan[];
  readonly rng: ReturnType<typeof createStrangeAttractorSeededRandom>;
  readonly maxSwarmEvents: number;
  readonly minHz: number;
  readonly maxHz: number;
}): { readonly events: readonly StrangeAttractorSwarmEvent[]; readonly rejectedEventCount: number } {
  const { attractors, maxHz, maxSwarmEvents, minHz, rng } = args;
  const events: StrangeAttractorSwarmEvent[] = [];
  let rejectedEventCount = 0;

  for (const attractor of attractors) {
    const span = Math.max(0.06, attractor.t1 - attractor.t0);
    const density = attractor.strength * 0.58 + attractor.radius * 0.42;
    const requested = clampInteger(Math.round(1 + density * 8 + span * 1.25), 1, 16);
    for (let localIndex = 0; localIndex < requested; localIndex += 1) {
      if (events.length >= maxSwarmEvents) {
        rejectedEventCount += 1;
        continue;
      }
      const family = pickFamily(attractor.familyBias, rng.next());
      const jitter = span * rng.signed(0.18);
      const phase = requested <= 1 ? 0.5 : (localIndex + 0.5) / requested;
      const startSec = clamp(attractor.t0 + span * phase + jitter, attractor.t0, attractor.t1);
      const durationSec = resolveFamilyDuration(family, span, attractor.radius, attractor.strength, rng.next());
      const pitchSpread = 18 + attractor.radius * 380;
      const hz = clampHz(attractor.hz * Math.pow(2, rng.signed(pitchSpread) / 1200), minHz, maxHz);
      const x = clamp01(attractor.x + rng.signed(attractor.radius * 0.42));
      const y = clamp01(hzToNormalizedY(hz, minHz, maxHz) + rng.signed(attractor.radius * 0.16));
      const amp = clamp01(0.035 + attractor.strength * 0.28 + rng.range(0, 0.05));
      events.push({
        id: `${attractor.id}-evt-${String(localIndex + 1).padStart(2, '0')}`,
        family,
        startSec,
        durationSec,
        hz,
        amp,
        pan: clamp(x * 2 - 1, -1, 1),
        x,
        y,
        attractorId: attractor.id,
        modulation: {
          pitchBendCents: Math.round(rng.signed(pitchSpread * 0.28)),
          ampShape: resolveAmpShape(family),
          filterBias: clamp01(attractor.radius * 0.55 + attractor.strength * 0.24),
          chaos: clamp01(family === 'spray' ? 0.55 + attractor.radius * 0.4 : attractor.radius * 0.5),
        },
      });
    }
  }

  return {
    events: events.sort((a, b) => a.startSec - b.startSec || a.hz - b.hz),
    rejectedEventCount,
  };
}

function buildCarrieroughnessCurves(
  windows: readonly NormalizedWindow[],
  durationSec: number,
): StrangeAttractorCarrieroughnessCurves {
  return {
    densityCurve: windows.map((windowInput) => ({ t: normalizedTime(windowInput, durationSec), value: windowInput.density })),
    roughnessCurve: windows.map((windowInput) => ({ t: normalizedTime(windowInput, durationSec), value: windowInput.roughness })),
    continuityCurve: windows.map((windowInput) => ({ t: normalizedTime(windowInput, durationSec), value: windowInput.continuity })),
    presenceCurve: windows.map((windowInput) => ({ t: normalizedTime(windowInput, durationSec), value: windowInput.presence })),
  };
}

function buildDronePlan(args: {
  readonly windows: readonly NormalizedWindow[];
  readonly durationSec: number;
  readonly rootHz: number;
  readonly minHz: number;
  readonly maxHz: number;
}): StrangeAttractorDronePlan {
  const { durationSec, maxHz, minHz, rootHz, windows } = args;
  const points = downsampleWindows(windows, 24);
  return {
    rootHzCurve: points.map((windowInput) => ({
      t: normalizedTime(windowInput, durationSec),
      hz: clampHz(rootHz * Math.pow(2, (windowInput.y - 0.5) * 0.85), minHz, maxHz),
    })),
    energyCurve: points.map((windowInput) => ({
      t: normalizedTime(windowInput, durationSec),
      value: clamp01(windowInput.energy * 0.7 + windowInput.density * 0.2 + windowInput.presence * 0.1),
    })),
    filteroughnessCurve: points.map((windowInput) => ({
      t: normalizedTime(windowInput, durationSec),
      hz: clamp(520 + windowInput.presence * 1050 + windowInput.energy * 360, 160, 3600),
      q: clamp(0.58 + windowInput.roughness * 1.2 + windowInput.bandwidth * 0.7, 0.35, 6),
    })),
    motionCurve: points.map((windowInput) => ({
      t: normalizedTime(windowInput, durationSec),
      x: windowInput.x,
      y: windowInput.y,
    })),
    effectCurve: points.map((windowInput) => ({
      t: normalizedTime(windowInput, durationSec),
      phaser: clamp01(windowInput.continuity * 0.35 + windowInput.presence * 0.3),
      flanger: clamp01(windowInput.roughness * 0.28 + windowInput.bandwidth * 0.3),
      saturation: clamp01(windowInput.energy * 0.45 + windowInput.roughness * 0.25),
      reverb: clamp01(0.18 + windowInput.presence * 0.34 + windowInput.continuity * 0.22),
    })),
  };
}

function summarizePlan(
  windows: readonly NormalizedWindow[],
  attractors: readonly StrangeAttractorNodePlan[],
  swarmEvents: readonly StrangeAttractorSwarmEvent[],
): StrangeAttractorCarrierPlan['summary'] {
  const eventCount = Math.max(1, swarmEvents.length);
  const familyCounts: Record<StrangeAttractorSwarmFamily, number> = {
    drift: 0,
    orbit: 0,
    spray: 0,
    cluster: 0,
  };
  for (const event of swarmEvents) familyCounts[event.family] += 1;
  return {
    attractorCount: attractors.length,
    swarmEventCount: swarmEvents.length,
    meanDensity: mean(windows.map((windowInput) => windowInput.density)),
    energyMean: mean(windows.map((windowInput) => windowInput.energy)),
    energyPeak: windows.reduce((peak, windowInput) => Math.max(peak, windowInput.energy), 0),
    driftBias: familyCounts.drift / eventCount,
    orbitBias: familyCounts.orbit / eventCount,
    sprayBias: familyCounts.spray / eventCount,
    clusterBias: familyCounts.cluster / eventCount,
  };
}

function normalizeFamilyBias(raw: MutableFamilyBias): StrangeAttractorFamilyBias {
  const drift = Math.max(0, raw.drift);
  const orbit = Math.max(0, raw.orbit);
  const spray = Math.max(0, raw.spray);
  const cluster = Math.max(0, raw.cluster);
  const sum = drift + orbit + spray + cluster || 1;
  return {
    drift: drift / sum,
    orbit: orbit / sum,
    spray: spray / sum,
    cluster: cluster / sum,
  };
}

function pickFamily(bias: StrangeAttractorFamilyBias, roll: number): StrangeAttractorSwarmFamily {
  if (roll < bias.drift) return 'drift';
  if (roll < bias.drift + bias.orbit) return 'orbit';
  if (roll < bias.drift + bias.orbit + bias.spray) return 'spray';
  return 'cluster';
}

function resolveFamilyDuration(
  family: StrangeAttractorSwarmFamily,
  span: number,
  radius: number,
  strength: number,
  roll: number,
): number {
  const shape = 0.75 + roll * 0.5;
  if (family === 'drift') return clamp(0.42 + span * 0.44 + radius * 0.8, 0.24, 2.4) * shape;
  if (family === 'orbit') return clamp(0.32 + span * 0.35 + strength * 0.72, 0.2, 2.0) * shape;
  if (family === 'spray') return clamp(0.08 + radius * 0.36, 0.045, 0.72) * shape;
  return clamp(0.12 + strength * 0.32 + radius * 0.18, 0.06, 0.92) * shape;
}

function resolveAmpShape(family: StrangeAttractorSwarmFamily): StrangeAttractorAmpShape {
  if (family === 'drift') return 'soft';
  if (family === 'orbit') return 'swarm';
  if (family === 'spray') return 'grainy';
  return 'pulse';
}

function inferDurationFromColumnCount(columnCount: number): number {
  return clamp(columnCount / 16, 2, 16);
}

function inferCentroidFromBands(column: CarrierColumnMeasure): number {
  const low = column.lowBandEnergy;
  const mid = column.midBandEnergy;
  const high = column.highBandEnergy;
  const sum = low + mid + high;
  if (sum <= EPSILON) return 0.5;
  return clamp01((low * 0.16 + mid * 0.5 + high * 0.84) / sum);
}

function normalizedYToHz(y: number, minHz: number, maxHz: number): number {
  const ratio = clamp01(y);
  return minHz * Math.pow(maxHz / minHz, ratio);
}

function hzToNormalizedY(hz: number, minHz: number, maxHz: number): number {
  const safeHz = clampHz(hz, minHz, maxHz);
  return clamp01(Math.log(safeHz / minHz) / Math.log(maxHz / minHz));
}

function downsampleWindows(
  windows: readonly NormalizedWindow[],
  maxPoints: number,
): readonly NormalizedWindow[] {
  if (windows.length <= maxPoints) return windows;
  const stride = Math.ceil(windows.length / maxPoints);
  const result: NormalizedWindow[] = [];
  for (let index = 0; index < windows.length; index += stride) {
    result.push(windows[index]);
  }
  return result;
}

function normalizedTime(windowInput: NormalizedWindow, durationSec: number): number {
  return clamp((windowInput.t0 + windowInput.t1) * 0.5, 0, durationSec);
}

function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function sanitizePositive(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= EPSILON) return fallback;
  return value;
}

function clampHz(value: number, minHz: number, maxHz: number): number {
  return clamp(value, minHz, maxHz);
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  if (value <= min) return min;
  if (value >= max) return max;
  return value;
}
