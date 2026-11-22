/* TS-MOD-09: Pro-DAW Bass Pattern & Sequencing Tools.
   Pure, immutable clip transformations, deterministic per-note probability,
   ratchet expansion, and microtonal True Pitch Glide target resolution.
   Built by tools/ts_module.cjs into __XenTs_bassDawTools.
   Zone: KALT/WARM (editor transforms & clip-step expansion; zero audio-thread allocation). */

export type BassGlideMode = 'none' | 'bend-up' | 'to-next';

export interface BassEventGlide {
  readonly mode: BassGlideMode;
}

export interface BassEventLike {
  readonly id: string;
  readonly startStep: number;
  readonly durationSteps: number;
  readonly ratioFromRoot: number;
  readonly centsFromRoot?: number;
  readonly octave: number;
  readonly velocity: number;
  readonly accent: number;
  readonly ghost?: boolean;
  readonly tie?: boolean;
  readonly glide?: BassEventGlide;
  readonly cutoffScale?: number;
  readonly probability?: number;
  readonly ratchet?: number;
  readonly source?: Record<string, unknown>;
  readonly [key: string]: unknown;
}

export interface BassSegmentMarkerLike {
  readonly id: string;
  readonly step: number;
  readonly kind: string;
  readonly locked?: boolean;
}

export interface BassClipLike {
  readonly id: string;
  readonly name: string;
  readonly stepCount: number;
  readonly bars: number;
  readonly stepsPerBar: number;
  readonly segmentCount: number;
  readonly segmentMarkers: readonly BassSegmentMarkerLike[];
  readonly events: readonly BassEventLike[];
  readonly generatorMeta: Record<string, unknown>;
  readonly [key: string]: unknown;
}

export type BassQuantizeGrid = '1/4' | '1/8' | '1/16' | '1/32' | '1/8T' | '1/16T';

export interface BassRatchetHit {
  readonly offsetSec: number;
  readonly durationSec: number;
  readonly velocityScale: number;
  readonly index: number;
  readonly count: number;
}

const MIN_DURATION = 0.1;
const MIN_RATIO = 0.03125;
const MAX_RATIO = 32;
const MAX_BARS = 16;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function effectiveRatio(ev: Pick<BassEventLike, 'ratioFromRoot' | 'octave'>): number {
  return clamp(ev.ratioFromRoot, MIN_RATIO, MAX_RATIO) * Math.pow(2, clamp(Math.round(ev.octave || 0), -5, 5));
}

function centsOf(ratio: number): number {
  return 1200 * Math.log2(Math.max(MIN_RATIO, ratio));
}

function targetSelection(events: readonly BassEventLike[], selectedIds?: ReadonlySet<string> | readonly string[] | null): Set<string> | null {
  if (!selectedIds) return null;
  const set = selectedIds instanceof Set ? selectedIds : new Set(selectedIds);
  if (!set.size) return null;
  const present = new Set<string>();
  for (const ev of events) if (set.has(ev.id)) present.add(ev.id);
  return present.size ? present : null;
}

function hash32(seed: number, salt: number): number {
  let h = (Math.imul((seed | 0) + 1, 2654435761) ^ Math.imul((salt | 0) + 1, 2246822519)) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519) >>> 0;
  h ^= h >>> 13;
  return h >>> 0;
}

/** Step increment for a musical grid division in a clip with `stepsPerBar` time units per bar. */
export function quantizeStepUnit(grid: BassQuantizeGrid, stepsPerBar = 16): number {
  const spb = Math.max(1, Number.isFinite(stepsPerBar) ? stepsPerBar : 16);
  switch (grid) {
    case '1/4': return spb / 4;
    case '1/8': return spb / 8;
    case '1/16': return spb / 16;
    case '1/32': return spb / 32;
    case '1/8T': return spb / 12;
    case '1/16T': return spb / 24;
    default: return spb / 16;
  }
}

/** Pulls event start positions towards the nearest grid line by `strength` (0..1). */
export function quantizeBassEvents<T extends BassEventLike>(
  events: readonly T[],
  stepCount: number,
  stepsPerBar: number,
  grid: BassQuantizeGrid = '1/16',
  strength = 1,
  selectedIds?: ReadonlySet<string> | readonly string[] | null
): T[] {
  const unit = Math.max(0.05, quantizeStepUnit(grid, stepsPerBar));
  const amt = clamp(strength, 0, 1);
  const maxStart = Math.max(0, stepCount - 0.05);
  const sel = targetSelection(events, selectedIds);
  return events.map(ev => {
    if (sel && !sel.has(ev.id)) return ev;
    const snapped = Math.round(ev.startStep / unit) * unit;
    const next = clamp(ev.startStep + (snapped - ev.startStep) * amt, 0, maxStart);
    return { ...ev, startStep: Math.round(next * 1000) / 1000 };
  });
}

/** Adds subtle deterministic timing and velocity micro-variations for organic groove. */
export function humanizeBassEvents<T extends BassEventLike>(
  events: readonly T[],
  stepCount: number,
  timingSteps = 0.08,
  velocityDepth = 0.12,
  seed = 1,
  selectedIds?: ReadonlySet<string> | readonly string[] | null
): T[] {
  const maxStart = Math.max(0, stepCount - 0.05);
  const dt = clamp(timingSteps, 0, 0.5);
  const dv = clamp(velocityDepth, 0, 0.5);
  const sel = targetSelection(events, selectedIds);
  return events.map((ev, idx) => {
    if (sel && !sel.has(ev.id)) return ev;
    const r1 = hash32(seed, idx * 2 + 1) / 4294967296 * 2 - 1;
    const r2 = hash32(seed, idx * 2 + 2) / 4294967296 * 2 - 1;
    const startStep = Math.round(clamp(ev.startStep + r1 * dt, 0, maxStart) * 1000) / 1000;
    const velocity = Math.round(clamp(ev.velocity + r2 * dv, 0.1, 1.4) * 100) / 100;
    return { ...ev, startStep, velocity };
  });
}

/** Extends each targeted event to meet the next event cleanly (wrapping at loop end). */
export function legatoBassEvents<T extends BassEventLike>(
  events: readonly T[],
  stepCount: number,
  gapSteps = 0.02,
  selectedIds?: ReadonlySet<string> | readonly string[] | null
): T[] {
  if (!events.length) return [];
  const gap = clamp(gapSteps, 0, 0.25);
  const sel = targetSelection(events, selectedIds);
  const sorted = [...events].sort((a, b) => a.startStep - b.startStep || a.id.localeCompare(b.id));
  const nextStartById = new Map<string, number>();
  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i];
    let nextDelta = stepCount;
    for (let k = 1; k <= sorted.length; k++) {
      const cand = sorted[(i + k) % sorted.length];
      let delta = cand.startStep - cur.startStep;
      if (delta <= 1e-4) delta += stepCount;
      if (delta > 1e-4) { nextDelta = delta; break; }
    }
    nextStartById.set(cur.id, Math.max(MIN_DURATION, nextDelta - gap));
  }
  return events.map(ev => {
    if (sel && !sel.has(ev.id)) return ev;
    const dur = clamp(nextStartById.get(ev.id) ?? ev.durationSteps, MIN_DURATION, stepCount);
    return { ...ev, durationSteps: Math.round(dur * 1000) / 1000 };
  });
}

/** Cyclically shifts event start positions by `deltaSteps` within the loop length. */
export function rotateBassEvents<T extends BassEventLike>(
  events: readonly T[],
  stepCount: number,
  deltaSteps: number,
  selectedIds?: ReadonlySet<string> | readonly string[] | null
): T[] {
  const len = Math.max(1, stepCount);
  const sel = targetSelection(events, selectedIds);
  return events.map(ev => {
    if (sel && !sel.has(ev.id)) return ev;
    const wrapped = ((ev.startStep + deltaSteps) % len + len) % len;
    return { ...ev, startStep: Math.round(wrapped * 1000) / 1000 };
  });
}

/** Transposes targeted events by an exact frequency ratio multiplier (preserving microtonal intervals). */
export function transposeBassEvents<T extends BassEventLike>(
  events: readonly T[],
  ratioMultiplier: number,
  selectedIds?: ReadonlySet<string> | readonly string[] | null
): T[] {
  if (!Number.isFinite(ratioMultiplier) || ratioMultiplier <= 0) return [...events];
  const sel = targetSelection(events, selectedIds);
  return events.map(ev => {
    if (sel && !sel.has(ev.id)) return ev;
    if (Math.abs(ratioMultiplier - 2) < 1e-9 || Math.abs(ratioMultiplier - 0.5) < 1e-9) {
      const oct = clamp(Math.round((ev.octave || 0) + (ratioMultiplier > 1 ? 1 : -1)), -4, 4);
      return { ...ev, octave: oct, centsFromRoot: centsOf(ev.ratioFromRoot) + oct * 1200 };
    }
    const nextRatio = clamp(ev.ratioFromRoot * ratioMultiplier, MIN_RATIO, MAX_RATIO);
    return { ...ev, ratioFromRoot: nextRatio, centsFromRoot: centsOf(nextRatio) + (ev.octave || 0) * 1200 };
  });
}

/** Scales event timing & durations by `factor` (0.5 = double-time, 2 = half-time), dropping events outside loop. */
export function scaleBassTime<T extends BassEventLike>(
  events: readonly T[],
  stepCount: number,
  factor: number,
  selectedIds?: ReadonlySet<string> | readonly string[] | null
): T[] {
  if (!Number.isFinite(factor) || factor <= 0) return [...events];
  const sel = targetSelection(events, selectedIds);
  const out: T[] = [];
  for (const ev of events) {
    if (sel && !sel.has(ev.id)) { out.push(ev); continue; }
    const startStep = Math.round(ev.startStep * factor * 1000) / 1000;
    if (startStep >= stepCount - 0.01) continue;
    const durationSteps = Math.round(clamp(ev.durationSteps * factor, MIN_DURATION, stepCount - startStep) * 1000) / 1000;
    out.push({ ...ev, startStep, durationSteps });
  }
  return out;
}

/** Reverses event start positions inside the clip (preserving each note's pitch & duration). */
export function reverseBassEvents<T extends BassEventLike>(
  events: readonly T[],
  stepCount: number,
  selectedIds?: ReadonlySet<string> | readonly string[] | null
): T[] {
  const sel = targetSelection(events, selectedIds);
  const targeted = events.filter(ev => !sel || sel.has(ev.id));
  if (targeted.length < 2) return [...events];
  const minS = sel ? Math.min(...targeted.map(e => e.startStep)) : 0;
  const maxS = sel ? Math.max(...targeted.map(e => e.startStep + Math.min(e.durationSteps, stepCount))) : stepCount;
  const spanEnd = Math.min(stepCount, Math.max(minS + MIN_DURATION, maxS));
  return events.map(ev => {
    if (sel && !sel.has(ev.id)) return ev;
    const mirrored = clamp(spanEnd - (ev.startStep - minS) - Math.min(ev.durationSteps, spanEnd - minS), 0, Math.max(0, stepCount - 0.05));
    return { ...ev, startStep: Math.round(mirrored * 1000) / 1000 };
  });
}

/** Duplicates selected events right after the selection end (Ctrl+D DAW behavior). */
export function duplicateBassEvents<T extends BassEventLike>(
  events: readonly T[],
  stepCount: number,
  selectedIds: ReadonlySet<string> | readonly string[],
  idPrefix = 'dup'
): { readonly events: T[]; readonly createdIds: readonly string[] } {
  const sel = targetSelection(events, selectedIds);
  if (!sel) return { events: [...events], createdIds: [] };
  const picked = events.filter(ev => sel.has(ev.id)).sort((a, b) => a.startStep - b.startStep);
  const firstStart = picked[0].startStep;
  const lastEnd = Math.max(...picked.map(ev => ev.startStep + Math.max(0.25, ev.durationSteps)));
  const span = Math.max(0.25, Math.ceil((lastEnd - firstStart) * 4) / 4);
  const created: T[] = [];
  const createdIds: string[] = [];
  picked.forEach((ev, i) => {
    let nextStart = ev.startStep + span;
    if (nextStart >= stepCount - 0.05) nextStart = ((nextStart % stepCount) + stepCount) % stepCount;
    const id = `${idPrefix}:${Date.now().toString(36)}:${i}:${Math.round(nextStart * 100)}`;
    createdIds.push(id);
    created.push({ ...ev, id, startStep: Math.round(clamp(nextStart, 0, Math.max(0, stepCount - 0.05)) * 1000) / 1000 });
  });
  return { events: [...events, ...created], createdIds };
}

/** Doubles clip bar count (up to 16 bars) and copies all events + segment markers into the second half. */
export function doubleBassClip<T extends BassClipLike>(clip: T, idPrefix = 'x2'): T {
  const curBars = Math.max(1, Math.round(clip.bars || 1));
  if (curBars >= MAX_BARS) return clip;
  const nextBars = Math.min(MAX_BARS, curBars * 2);
  const spb = Math.max(1, Math.round(clip.stepsPerBar || 16));
  const oldSteps = curBars * spb;
  const nextSteps = nextBars * spb;
  const copiedEvents = clip.events.flatMap((ev, i) => {
    const startStep = ev.startStep + oldSteps;
    if (startStep >= nextSteps - 0.01) return [];
    return [{ ...ev, id: `${idPrefix}:${ev.id}:${i}`, startStep: Math.round(startStep * 1000) / 1000 }];
  });
  const segMarkers = clip.segmentMarkers.filter(m => m.kind === 'segment');
  const copiedMarkers = segMarkers.flatMap((m, i) => {
    const step = m.step + oldSteps;
    if (step >= nextSteps - 0.01) return [];
    return [{ ...m, id: `${idPrefix}:seg:${i}:${Math.round(step * 100)}`, step }];
  });
  return {
    ...clip,
    bars: nextBars,
    stepCount: nextSteps,
    events: [...clip.events, ...copiedEvents],
    segmentMarkers: [...clip.segmentMarkers, ...copiedMarkers],
    generatorMeta: { ...clip.generatorMeta, kind: 'manual' }
  };
}

/** Resolves the true microtonal target frequency (Hz) of the next note in the clip for `glide.mode === 'to-next'`. */
export function resolveBassGlideTargetHz(
  events: readonly BassEventLike[],
  current: BassEventLike,
  stepCount: number,
  rootHz: number
): number | null {
  if (!events.length || !Number.isFinite(rootHz) || rootHz <= 0) return null;
  const len = Math.max(1, stepCount);
  const curStart = ((current.startStep % len) + len) % len;
  let bestDelta = Infinity;
  let target: BassEventLike | null = null;
  for (const cand of events) {
    if (cand.id === current.id) continue;
    const candStart = ((cand.startStep % len) + len) % len;
    let delta = candStart - curStart;
    if (delta <= 1e-4) delta += len;
    if (delta < bestDelta) {
      bestDelta = delta;
      target = cand;
    }
  }
  if (!target) return null;
  const targetHz = rootHz * effectiveRatio(target);
  return Number.isFinite(targetHz) && targetHz > 0 ? targetHz : null;
}

/** Deterministic per-event probability gate (mirrors __f53StepAllowed for drums). */
export function shouldTriggerBassEvent(probability: number | undefined, eventId: string, round: number): boolean {
  const chance = typeof probability === 'number' && Number.isFinite(probability) ? probability : 1;
  if (chance >= 0.999) return true;
  if (chance <= 0) return false;
  let h = (Math.imul((round | 0) + 1, 2246822519) ^ 0x811c9dc5) >>> 0;
  for (let i = 0; i < eventId.length; i++) h = Math.imul(h ^ eventId.charCodeAt(i), 16777619) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519) >>> 0;
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296 < chance;
}

/** Expands an event with ratchet count 1..4 into evenly spaced sub-hits within its duration. */
export function expandBassEventRatchets(durationSec: number, ratchet?: number): readonly BassRatchetHit[] {
  const count = typeof ratchet === 'number' && Number.isFinite(ratchet) ? Math.max(1, Math.min(4, Math.round(ratchet))) : 1;
  const safeDur = Math.max(0.025, Number.isFinite(durationSec) ? durationSec : 0.12);
  if (count === 1) return [{ offsetSec: 0, durationSec: safeDur, velocityScale: 1, index: 0, count: 1 }];
  const slice = safeDur / count;
  const hitDur = Math.max(0.025, slice * 0.88);
  const out: BassRatchetHit[] = [];
  for (let i = 0; i < count; i++) {
    // Natural percussive crescendo/articulation across sub-hits so rolls breathe instead of buzzing flatly.
    const velocityScale = i === 0 ? 1 : 0.72 + (i / (count - 1)) * 0.24;
    out.push({ offsetSec: i * slice, durationSec: hitDur, velocityScale, index: i, count });
  }
  return out;
}

/** Clamps a per-note cutoff scale factor (1 = neutral, 0.35..2.4). */
export function cleanCutoffScale(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  const c = clamp(value, 0.35, 2.4);
  return Math.abs(c - 1) <= 1e-4 ? undefined : Math.round(c * 100) / 100;
}

/** Clamps per-note trigger probability (1 = always/omitted, 0.05..0.99). */
export function cleanProbability(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  const c = clamp(value, 0.05, 1);
  return c >= 0.999 ? undefined : Math.round(c * 100) / 100;
}

/** Clamps per-note ratchet subdivision (1 = normal/omitted, 2..4). */
export function cleanRatchet(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  const c = Math.max(1, Math.min(4, Math.round(value)));
  return c <= 1 ? undefined : c;
}
