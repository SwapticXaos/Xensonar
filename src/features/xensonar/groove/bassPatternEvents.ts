import { generatePsyBassPattern } from '../../resonance/psybass/patterns';
import type { GrooveDescriptorVector as PsyGrooveDescriptorVector, PsyBassPattern, PsyBassStyle } from '../../resonance/psybass/types';
import { generateRhythmForgePattern } from '../../resonance/rhythmforge/patterns';
import type { GeneratedPattern, GrooveDescriptorVector as RhythmForgeGrooveDescriptorVector } from '../../resonance/rhythmforge/types';

export type BassEventSourceKind = 'classic' | 'psybass' | 'rhythmforge' | 'manual' | 'melodic-loop';
export type BassEventPitchKind = 'ratio' | 'semitone' | 'lineHz';
export type BassRootBinding = 'live-step-root' | 'bar-frozen' | 'free';
export type BassClipTimingKind = 'straight' | 'rhythmforge' | 'psybass';
export type BassPitchSnapMode = 'free' | 'magnet' | 'locked';
export type BassPitchGuideKind = 'ji' | 'grid' | 'both';
export type BassRandomCharacter = 'frei' | 'sparsam' | 'dicht' | 'psy' | 'forge' | 'kick-nah';

export interface BassEventGlide {
  mode: 'none' | 'bend-up' | 'to-next';
  targetRatioFromRoot?: number;
}

export interface BassPitchSnapHint {
  kind: BassPitchGuideKind;
  label: string;
  ratio: number;
  strength: number;
}

export interface BassSegmentMarker {
  id: string;
  step: number;
  kind: 'bar' | 'segment';
  locked?: boolean;
}

export interface BassEventSourceInfo {
  generatorKind: BassEventSourceKind;
  originalStepIndex?: number;
  originalPitchKind?: BassEventPitchKind;
  presetId?: string;
  style?: string;
}

export interface BassEvent {
  id: string;
  startStep: number;
  durationSteps: number;
  ratioFromRoot: number;
  centsFromRoot?: number;
  octave: number;
  snapHint?: BassPitchSnapHint;
  velocity: number;
  accent: number;
  ghost?: boolean;
  tie?: boolean;
  glide?: BassEventGlide;
  source?: BassEventSourceInfo;
}

export interface BassClipGeneratorMeta {
  kind: BassEventSourceKind;
  presetId?: string;
  style?: string;
  flavor?: 'rooted' | 'braided' | 'fractured';
  seed?: number;
  barIndex?: number;
  rootBinding?: BassRootBinding;
  timingKind?: BassClipTimingKind;
  swing?: number;
  noteLength?: number;
  rootHz?: number;
}

const MIN_BASS_EVENT_DURATION_STEPS = 0.1;
const MIN_BASS_RATIO_FROM_ROOT = 0.03125;
const DEFAULT_BASS_STEPS_PER_BAR = 16;
const DEFAULT_BASS_SEGMENT_COUNT = 4;
const MAX_BASS_BARS = 16;
const MAX_BASS_STEPS_PER_BAR = 96;
const MAX_BASS_SEGMENT_COUNT = 32;

function clampBassDurationSteps(value: number, stepCount = 16) {
  return clamp(value, MIN_BASS_EVENT_DURATION_STEPS, Math.max(MIN_BASS_EVENT_DURATION_STEPS, stepCount));
}

function normalizeBassRootBinding(value: unknown): BassRootBinding {
  return value === 'bar-frozen' || value === 'free' || value === 'live-step-root' ? value : 'live-step-root';
}

function normalizePitchSnapMode(value: unknown): BassPitchSnapMode {
  return value === 'free' || value === 'locked' || value === 'magnet' ? value : 'magnet';
}

function normalizePitchGuideKind(value: unknown): BassPitchGuideKind {
  return value === 'grid' || value === 'both' || value === 'ji' ? value : 'ji';
}

const ratioToCents = (ratio: number) => 1200 * Math.log2(Math.max(MIN_BASS_RATIO_FROM_ROOT, ratio));
const centsToRatio = (cents: number) => Math.pow(2, cents / 1200);

export interface BassClip {
  id: string;
  name: string;
  stepCount: number;
  bars: number;
  stepsPerBar: number;
  segmentCount: number;
  segmentMarkers: BassSegmentMarker[];
  pitchSnapMode?: BassPitchSnapMode;
  pitchGuideKind?: BassPitchGuideKind;
  events: BassEvent[];
  generatorMeta: BassClipGeneratorMeta;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
const stableId = (...parts: Array<string | number | undefined>) => parts.filter((part) => part !== undefined && part !== '').join(':');

const DEFAULT_DESCRIPTORS: PsyGrooveDescriptorVector & RhythmForgeGrooveDescriptorVector = {
  cohesion: 0.62,
  turbulence: 0.34,
  crystallization: 0.48,
  pressure: 0.58,
  fracture: 0.26,
  orbitality: 0.42,
  recurrence: 0.62,
};

export const BASS_JI_GUIDE_RATIOS: Array<{ label: string; ratio: number }> = [
  { label: '1/1', ratio: 1 },
  { label: '16/15', ratio: 16 / 15 },
  { label: '9/8', ratio: 9 / 8 },
  { label: '6/5', ratio: 6 / 5 },
  { label: '5/4', ratio: 5 / 4 },
  { label: '4/3', ratio: 4 / 3 },
  { label: '3/2', ratio: 3 / 2 },
  { label: '7/4', ratio: 7 / 4 },
  { label: '2/1', ratio: 2 },
  { label: '3/1', ratio: 3 },
  { label: '4/1', ratio: 4 },
];

const BASS_PATTERN_LABELS: Record<string, string> = {
  offbeat: 'Offbeat',
  walking: 'Walking',
  stotter: 'Stotter',
  arpeggio: 'Arpeggio',
  psy_classic: 'PsyBass · Classic Offbeat',
  psy_rolling: 'PsyBass · Rolling',
  psy_gallop: 'PsyBass · Gallop',
  psy_triplet: 'PsyBass · Triplet Ghost',
  psy_dark: 'PsyBass · Dark Forest',
  forge_rooted: 'RhythmForge · Rooted',
  forge_braided: 'RhythmForge · Braided',
  forge_fractured: 'RhythmForge · Fractured',
};

export function readBassPatternLabel(pattern: string) {
  return BASS_PATTERN_LABELS[pattern] ?? pattern;
}

export function isClassicBassPattern(pattern: string) {
  return pattern === 'offbeat' || pattern === 'walking' || pattern === 'stotter' || pattern === 'arpeggio';
}

export function isPsyBassPatternId(pattern: string) {
  return pattern.startsWith('psy_');
}

export function isRhythmForgeBassPatternId(pattern: string) {
  return pattern.startsWith('forge_');
}

export function psyBassStyleFromPattern(pattern: string): PsyBassStyle {
  if (pattern === 'psy_rolling') return 'rolling';
  if (pattern === 'psy_gallop') return 'gallop';
  if (pattern === 'psy_triplet') return 'tripletGhost';
  if (pattern === 'psy_dark') return 'darkForest';
  return 'classicOffbeat';
}

export function rhythmForgeFlavorFromPattern(pattern: string): 'rooted' | 'braided' | 'fractured' {
  if (pattern === 'forge_braided') return 'braided';
  if (pattern === 'forge_fractured') return 'fractured';
  return 'rooted';
}

function makeEvent(args: {
  id: string;
  startStep: number;
  durationSteps: number;
  ratioFromRoot: number;
  octave?: number;
  velocity?: number;
  accent?: number;
  ghost?: boolean;
  tie?: boolean;
  glideMode?: BassEventGlide['mode'];
  source?: BassEventSourceInfo;
}): BassEvent {
  const octave = args.octave ?? 0;
  return {
    id: args.id,
    startStep: args.startStep,
    durationSteps: clampBassDurationSteps(args.durationSteps, 8),
    ratioFromRoot: clamp(args.ratioFromRoot, MIN_BASS_RATIO_FROM_ROOT, 32),
    centsFromRoot: ratioToCents(clamp(args.ratioFromRoot, MIN_BASS_RATIO_FROM_ROOT, 32)) + octave * 1200,
    octave,
    velocity: clamp(args.velocity ?? 1, 0, 1.5),
    accent: clamp(args.accent ?? args.velocity ?? 0.72, 0, 1.5),
    ghost: args.ghost || undefined,
    tie: args.tie || undefined,
    glide: args.glideMode && args.glideMode !== 'none' ? { mode: args.glideMode } : undefined,
    source: args.source,
  };
}

export function classicBassPatternToClip(pattern: string): BassClip {
  const events: BassEvent[] = [];
  const sourceBase = { generatorKind: 'classic' as const, presetId: pattern, originalPitchKind: 'ratio' as const };
  const push = (step: number, ratio: number, durationSteps: number, accent: number) => {
    events.push(makeEvent({
      id: stableId('classic', pattern, step),
      startStep: step,
      durationSteps,
      ratioFromRoot: ratio,
      accent,
      velocity: 1,
      source: { ...sourceBase, originalStepIndex: step },
    }));
  };

  if (pattern === 'offbeat') {
    [2, 6, 10, 14].forEach((step) => push(step, 1, 1.5, 0.72));
  } else if (pattern === 'walking') {
    [1, 1.189, 1.333, 1.498].forEach((ratio, index) => push(index * 4, ratio, 1.8, 0.68));
  } else if (pattern === 'stotter') {
    [0, 1, 3, 4, 6, 8, 9, 11, 14].forEach((step) => push(step, step % 8 === 0 ? 1 : 1.5, 0.8, 0.78));
  } else if (pattern === 'arpeggio') {
    [0, 2, 4, 6, 8, 10, 12, 14].forEach((step, index) => {
      const intervals = [1, 1.5, 2, 2.5];
      push(step, intervals[index % intervals.length] ?? 1, 1.5, 0.64);
    });
  }

  return {
    id: stableId('bass-clip', 'classic', pattern),
    name: readBassPatternLabel(pattern),
    stepCount: 16,
    bars: 1,
    stepsPerBar: 16,
    segmentCount: DEFAULT_BASS_SEGMENT_COUNT,
    segmentMarkers: createDefaultBassSegmentMarkers(1, 16, DEFAULT_BASS_SEGMENT_COUNT),
    pitchSnapMode: 'magnet',
    pitchGuideKind: 'ji',
    events,
    generatorMeta: { kind: 'classic', presetId: pattern, rootBinding: 'live-step-root', timingKind: 'straight' },
  };
}

export function psyBassPatternToClip(pattern: PsyBassPattern, presetId = 'psy_preview'): BassClip {
  const events = pattern.steps.flatMap((step, index) => {
    if (!step.active) return [];
    const semitoneRatio = Math.pow(2, (step.semitone + step.octave * 12) / 12);
    return makeEvent({
      id: stableId('psy', presetId, pattern.barIndex, index),
      startStep: index,
      durationSteps: clamp(0.22 + step.length * 1.25, 0.12, 1.7),
      ratioFromRoot: semitoneRatio,
      octave: 0,
      accent: step.accent,
      velocity: step.ghost ? 0.64 : 1,
      ghost: step.ghost,
      glideMode: step.glideToNext ? 'bend-up' : 'none',
      source: { generatorKind: 'psybass', presetId, style: pattern.style, originalStepIndex: index, originalPitchKind: 'semitone' },
    });
  });
  return {
    id: stableId('bass-clip', 'psybass', presetId, pattern.barIndex),
    name: readBassPatternLabel(presetId),
    stepCount: pattern.steps.length,
    bars: 1,
    stepsPerBar: pattern.steps.length,
    segmentCount: DEFAULT_BASS_SEGMENT_COUNT,
    segmentMarkers: createDefaultBassSegmentMarkers(1, pattern.steps.length, DEFAULT_BASS_SEGMENT_COUNT),
    pitchSnapMode: 'magnet',
    pitchGuideKind: 'ji',
    events,
    generatorMeta: { kind: 'psybass', presetId, style: pattern.style, barIndex: pattern.barIndex, rootBinding: 'bar-frozen', timingKind: 'psybass', swing: pattern.swing, rootHz: pattern.rootHz },
  };
}

export function rhythmForgeBassPatternToClip(pattern: GeneratedPattern, presetId = 'forge_preview'): BassClip {
  const durationBase = 0.66 + pattern.noteLength;
  const flavor = rhythmForgeFlavorFromPattern(presetId);
  const events = pattern.bass.flatMap((step, index) => {
    if (!step.active) return [];
    return makeEvent({
      id: stableId('forge', presetId, pattern.barIndex, index),
      startStep: index,
      durationSteps: step.tie ? durationBase * 1.55 : durationBase,
      ratioFromRoot: step.ratio,
      octave: step.octave,
      accent: step.accent ?? 0.7,
      velocity: 1,
      ghost: (step.accent ?? 0.7) < 0.45,
      tie: step.tie,
      glideMode: step.glideToNext ? 'bend-up' : 'none',
      source: { generatorKind: 'rhythmforge', presetId, style: flavor, originalStepIndex: index, originalPitchKind: 'ratio' },
    });
  });
  return {
    id: stableId('bass-clip', 'rhythmforge', presetId, pattern.barIndex),
    name: readBassPatternLabel(presetId),
    stepCount: pattern.bass.length,
    bars: 1,
    stepsPerBar: pattern.bass.length,
    segmentCount: DEFAULT_BASS_SEGMENT_COUNT,
    segmentMarkers: createDefaultBassSegmentMarkers(1, pattern.bass.length, DEFAULT_BASS_SEGMENT_COUNT),
    pitchSnapMode: 'magnet',
    pitchGuideKind: 'ji',
    events,
    generatorMeta: { kind: 'rhythmforge', presetId, flavor, barIndex: pattern.barIndex, rootBinding: 'live-step-root', timingKind: 'rhythmforge', swing: pattern.swing, noteLength: pattern.noteLength, rootHz: pattern.rootHz },
  };
}

export function buildBassPatternPreviewClip(args: {
  pattern: string;
  rootHz?: number;
  seed?: number;
  barIndex?: number;
  swing?: number;
  bassGrit?: number;
  descriptors?: Partial<PsyGrooveDescriptorVector & RhythmForgeGrooveDescriptorVector>;
}): BassClip {
  const descriptors = { ...DEFAULT_DESCRIPTORS, ...(args.descriptors ?? {}) };
  const barIndex = args.barIndex ?? 0;
  const seed = args.seed ?? 0x51b3;
  const rootHz = args.rootHz ?? 49;
  const swing = clamp(args.swing ?? 0.06, 0, 1);
  if (isRhythmForgeBassPatternId(args.pattern)) {
    const generated = generateRhythmForgePattern({
      barIndex,
      seed: seed ^ 0x51b3,
      rootHz,
      baseSwing: 0.04 + swing * 0.1,
      descriptors,
      flavor: rhythmForgeFlavorFromPattern(args.pattern),
    });
    return rhythmForgeBassPatternToClip(generated, args.pattern);
  }
  if (isPsyBassPatternId(args.pattern)) {
    const style = psyBassStyleFromPattern(args.pattern);
    const generated = generatePsyBassPattern({
      barIndex,
      seed: seed ^ 0x9d31,
      rootHz,
      stepCount: 16,
      baseSwing: 0.02 + swing * 0.08,
      styleMorph: ({ classicOffbeat: 0.04, rolling: 0.36, gallop: 0.62, tripletGhost: 0.72, darkForest: 0.9 } as Record<PsyBassStyle, number>)[style],
      density: clamp(0.68 + (args.bassGrit ?? 0.18) * 0.16 + descriptors.pressure * 0.1, 0, 1),
      descriptors,
    });
    return psyBassPatternToClip(generated, args.pattern);
  }
  return classicBassPatternToClip(args.pattern);
}

export function resolveBassEventFrequencyHz(event: BassEvent, liveRootHz: number) {
  return liveRootHz * event.ratioFromRoot * Math.pow(2, event.octave);
}


export function clampBassBars(value: number) {
  return clamp(Math.round(value), 1, MAX_BASS_BARS);
}

export function clampBassStepsPerBar(value: number) {
  return clamp(Math.round(value), 1, MAX_BASS_STEPS_PER_BAR);
}

export function clampBassSegmentCount(value: number) {
  return clamp(Math.round(value), 1, MAX_BASS_SEGMENT_COUNT);
}

function bassBarBoundaryMarkers(bars: number, stepsPerBar: number): BassSegmentMarker[] {
  const safeBars = clampBassBars(bars);
  const safeStepsPerBar = clampBassStepsPerBar(stepsPerBar);
  return Array.from({ length: safeBars + 1 }, (_, bar) => ({
    id: stableId('bar', bar, safeBars, safeStepsPerBar),
    step: bar * safeStepsPerBar,
    kind: 'bar' as const,
    locked: true,
  }));
}

function isBassBarBoundary(step: number, stepsPerBar: number) {
  const safeStepsPerBar = Math.max(1, stepsPerBar);
  return Math.abs(step / safeStepsPerBar - Math.round(step / safeStepsPerBar)) < 0.001;
}

export function createDefaultBassSegmentMarkers(bars = 1, stepsPerBar = DEFAULT_BASS_STEPS_PER_BAR, segmentCount = DEFAULT_BASS_SEGMENT_COUNT): BassSegmentMarker[] {
  const safeBars = clampBassBars(bars);
  const safeStepsPerBar = clampBassStepsPerBar(stepsPerBar);
  const safeSegmentCount = clampBassSegmentCount(segmentCount);
  const markers: BassSegmentMarker[] = [...bassBarBoundaryMarkers(safeBars, safeStepsPerBar)];
  if (safeSegmentCount > 1) {
    for (let bar = 0; bar < safeBars; bar += 1) {
      for (let segment = 1; segment < safeSegmentCount; segment += 1) {
        const step = bar * safeStepsPerBar + (segment / safeSegmentCount) * safeStepsPerBar;
        markers.push({
          id: stableId('seg', bar, segment, safeBars, safeStepsPerBar, safeSegmentCount),
          step,
          kind: 'segment',
          locked: false,
        });
      }
    }
  }
  return markers.sort((a, b) => a.step - b.step || a.id.localeCompare(b.id));
}

export function inferBassSegmentCount(markers: unknown, bars = 1): number {
  const raw = Array.isArray(markers) ? markers : [];
  const safeBars = Math.max(1, Math.round(bars));
  const guideCount = raw.filter((marker) => !!marker && typeof marker === 'object' && (marker as BassSegmentMarker).kind === 'segment').length;
  const perBar = guideCount > 0 ? Math.round(guideCount / safeBars) : 0;
  return clampBassSegmentCount(perBar + 1 || DEFAULT_BASS_SEGMENT_COUNT);
}

export function normalizeBassSegmentMarkers(markers: unknown, stepCount: number, stepsPerBar: number, segmentCount = DEFAULT_BASS_SEGMENT_COUNT): BassSegmentMarker[] {
  const safeStepsPerBar = clampBassStepsPerBar(stepsPerBar);
  const safeBars = clampBassBars(Math.max(1, Math.round(stepCount / safeStepsPerBar)));
  const safeStepCount = safeBars * safeStepsPerBar;
  const safeSegmentCount = clampBassSegmentCount(segmentCount);
  const raw = Array.isArray(markers) ? markers : [];
  const barMarkers = bassBarBoundaryMarkers(safeBars, safeStepsPerBar);
  const rawGuides = raw
    .filter((marker): marker is BassSegmentMarker => !!marker && typeof marker === 'object' && marker.kind === 'segment')
    .map((marker, index) => ({
      id: typeof marker.id === 'string' && marker.id ? marker.id : stableId('seg', index, Math.round(Number(marker.step) || 0)),
      step: clamp(Number(marker.step), 0.001, Math.max(0.001, safeStepCount - 0.001)),
      kind: 'segment' as const,
      locked: false,
    }))
    .filter((marker) => !isBassBarBoundary(marker.step, safeStepsPerBar));
  const defaultGuides = createDefaultBassSegmentMarkers(safeBars, safeStepsPerBar, safeSegmentCount).filter((marker) => marker.kind === 'segment');
  const candidateGuides = rawGuides.length ? rawGuides : defaultGuides;
  const dedupedGuides: BassSegmentMarker[] = [];
  candidateGuides
    .sort((a, b) => a.step - b.step || a.id.localeCompare(b.id))
    .forEach((marker) => {
      if (dedupedGuides.some((entry) => Math.abs(entry.step - marker.step) < 0.05)) return;
      dedupedGuides.push(marker);
    });
  return [...barMarkers, ...dedupedGuides].sort((a, b) => a.step - b.step || (a.kind === 'bar' ? -1 : 1) || a.id.localeCompare(b.id));
}

function findNearestBassGuideRatio(ratio: number, guideKind: BassPitchGuideKind): { label: string; ratio: number; cents: number } {
  const guides = guideKind === 'grid'
    ? Array.from({ length: 25 }, (_, index) => ({ label: `${index - 12 > 0 ? '+' : ''}${index - 12}`, ratio: centsToRatio((index - 12) * 100) }))
    : guideKind === 'both'
      ? [...BASS_JI_GUIDE_RATIOS, ...Array.from({ length: 25 }, (_, index) => ({ label: `${index - 12 > 0 ? '+' : ''}${index - 12}`, ratio: centsToRatio((index - 12) * 100) }))]
      : BASS_JI_GUIDE_RATIOS;
  return guides.reduce<{ label: string; ratio: number; cents: number }>((best, guide) => {
    const cents = Math.abs(ratioToCents(ratio / guide.ratio));
    return cents < best.cents ? { label: guide.label, ratio: guide.ratio, cents } : best;
  }, { label: '1/1', ratio: 1, cents: Number.POSITIVE_INFINITY });
}

export function applyBassPitchSnap(ratio: number, mode: BassPitchSnapMode = 'magnet', guideKind: BassPitchGuideKind = 'ji'): { ratioFromRoot: number; snapHint?: BassPitchSnapHint } {
  const safeRatio = clamp(ratio, MIN_BASS_RATIO_FROM_ROOT, 32);
  const nearest = findNearestBassGuideRatio(safeRatio, guideKind);
  if (mode === 'locked') {
    return {
      ratioFromRoot: clamp(nearest.ratio, MIN_BASS_RATIO_FROM_ROOT, 32),
      snapHint: { kind: guideKind, label: nearest.label, ratio: nearest.ratio, strength: 1 },
    };
  }
  if (mode === 'magnet' && nearest.cents <= 36) {
    const strength = clamp(1 - nearest.cents / 36, 0, 1);
    const pulledCents = ratioToCents(safeRatio) * (1 - strength * 0.48) + ratioToCents(nearest.ratio) * (strength * 0.48);
    return {
      ratioFromRoot: clamp(centsToRatio(pulledCents), MIN_BASS_RATIO_FROM_ROOT, 32),
      snapHint: { kind: guideKind, label: nearest.label, ratio: nearest.ratio, strength },
    };
  }
  return { ratioFromRoot: safeRatio, snapHint: nearest.cents <= 55 ? { kind: guideKind, label: nearest.label, ratio: nearest.ratio, strength: 0 } : undefined };
}

export function summarizeBassClip(clip: BassClip) {
  const active = clip.events.length;
  const ghosts = clip.events.filter((event) => event.ghost).length;
  const glides = clip.events.filter((event) => event.glide && event.glide.mode !== 'none').length;
  const minRatio = clip.events.reduce((min, event) => Math.min(min, event.ratioFromRoot * Math.pow(2, event.octave)), Number.POSITIVE_INFINITY);
  const maxRatio = clip.events.reduce((max, event) => Math.max(max, event.ratioFromRoot * Math.pow(2, event.octave)), 0);
  return {
    active,
    ghosts,
    glides,
    minRatio: Number.isFinite(minRatio) ? minRatio : 1,
    maxRatio: maxRatio || 1,
  };
}

export function normalizeBassEvent(event: BassEvent, stepCount: number): BassEvent {
  const ratioFromRoot = clamp(event.ratioFromRoot, MIN_BASS_RATIO_FROM_ROOT, 32);
  const octave = clamp(Math.round(event.octave), -5, 5);
  return {
    ...event,
    startStep: clamp(Number(event.startStep), 0, Math.max(0, stepCount - 0.001)),
    durationSteps: clampBassDurationSteps(event.durationSteps, stepCount),
    ratioFromRoot,
    centsFromRoot: ratioToCents(ratioFromRoot) + octave * 1200,
    octave,
    velocity: clamp(event.velocity, 0, 1.5),
    accent: clamp(event.accent, 0, 1.5),
  };
}

export function normalizeBassClip(clip: BassClip): BassClip {
  const rawBars = Number((clip as Partial<BassClip>).bars);
  const bars = clampBassBars(Number.isFinite(rawBars) && rawBars > 0 ? rawBars : 1);
  const rawStepsPerBar = Number((clip as Partial<BassClip>).stepsPerBar);
  const fallbackStepCount = Math.max(1, Math.round(Number((clip as Partial<BassClip>).stepCount) || DEFAULT_BASS_STEPS_PER_BAR));
  const stepsPerBar = clampBassStepsPerBar(Number.isFinite(rawStepsPerBar) && rawStepsPerBar > 0 ? rawStepsPerBar : fallbackStepCount / bars || DEFAULT_BASS_STEPS_PER_BAR);
  const rawSegmentCount = Number((clip as Partial<BassClip>).segmentCount);
  const segmentCount = clampBassSegmentCount(Number.isFinite(rawSegmentCount) && rawSegmentCount > 0 ? rawSegmentCount : inferBassSegmentCount((clip as Partial<BassClip>).segmentMarkers, bars));
  const stepCount = Math.max(1, bars * stepsPerBar);
  return {
    ...clip,
    stepCount,
    bars,
    stepsPerBar,
    segmentCount,
    segmentMarkers: normalizeBassSegmentMarkers((clip as Partial<BassClip>).segmentMarkers, stepCount, stepsPerBar, segmentCount),
    pitchSnapMode: normalizePitchSnapMode((clip as Partial<BassClip>).pitchSnapMode),
    pitchGuideKind: normalizePitchGuideKind((clip as Partial<BassClip>).pitchGuideKind),
    events: clip.events.map((event) => normalizeBassEvent(event, stepCount)).sort((a, b) => a.startStep - b.startStep || a.id.localeCompare(b.id)),
  };
}

export function cloneBassClipAsWorkcopy(clip: BassClip, name?: string, now = Date.now()): BassClip {
  const suffix = now.toString(36);
  return normalizeBassClip({
    ...clip,
    id: stableId('bass-clip', 'workcopy', suffix),
    name: name?.trim() || `${clip.name} Arbeitskopie`,
    events: clip.events.map((event, index) => ({
      ...event,
      id: stableId('workcopy', suffix, index),
      source: { ...event.source, generatorKind: 'manual' },
    })),
    generatorMeta: {
      ...clip.generatorMeta,
      kind: 'manual',
      presetId: clip.generatorMeta.presetId,
      style: clip.generatorMeta.style,
      flavor: clip.generatorMeta.flavor,
      rootBinding: normalizeBassRootBinding(clip.generatorMeta.rootBinding),
      timingKind: clip.generatorMeta.timingKind,
      swing: clip.generatorMeta.swing,
      noteLength: clip.generatorMeta.noteLength,
      rootHz: clip.generatorMeta.rootHz,
    },
  });
}


export function resizeBassClipTiming(clip: BassClip, bars: number, stepsPerBar: number, segmentCount = clip.segmentCount ?? DEFAULT_BASS_SEGMENT_COUNT): BassClip {
  const current = normalizeBassClip(clip);
  const safeBars = clampBassBars(bars);
  const safeStepsPerBar = clampBassStepsPerBar(stepsPerBar);
  const safeSegmentCount = clampBassSegmentCount(segmentCount);
  const nextStepCount = safeBars * safeStepsPerBar;
  const scale = nextStepCount / Math.max(1, current.stepCount);
  const segmentCountChanged = safeSegmentCount !== current.segmentCount;
  return normalizeBassClip({
    ...current,
    bars: safeBars,
    stepsPerBar: safeStepsPerBar,
    segmentCount: safeSegmentCount,
    stepCount: nextStepCount,
    segmentMarkers: segmentCountChanged
      ? createDefaultBassSegmentMarkers(safeBars, safeStepsPerBar, safeSegmentCount)
      : current.segmentMarkers.filter((marker) => marker.kind === 'segment').map((marker) => ({ ...marker, step: marker.step * scale })),
    events: current.events.map((event) => ({
      ...event,
      startStep: event.startStep * scale,
      durationSteps: event.durationSteps * scale,
    })),
    generatorMeta: { ...current.generatorMeta, kind: 'manual' },
  });
}

export function patchBassClipSegmentMarker(clip: BassClip, markerId: string, step: number): BassClip {
  const current = normalizeBassClip(clip);
  return normalizeBassClip({
    ...current,
    generatorMeta: { ...current.generatorMeta, kind: 'manual' },
    segmentMarkers: current.segmentMarkers.map((marker) => marker.id === markerId && !marker.locked ? { ...marker, step } : marker),
  });
}

export function addBassClipSegmentMarker(clip: BassClip, step: number): BassClip {
  const current = normalizeBassClip(clip);
  const marker: BassSegmentMarker = { id: stableId('seg', 'manual', Date.now().toString(36), Math.round(step * 1000)), step: clamp(step, 0, Math.max(0, current.stepCount - 0.001)), kind: 'segment' };
  return normalizeBassClip({
    ...current,
    generatorMeta: { ...current.generatorMeta, kind: 'manual' },
    segmentMarkers: [...current.segmentMarkers, marker],
  });
}

export function removeBassClipSegmentMarker(clip: BassClip, markerId: string): BassClip {
  const current = normalizeBassClip(clip);
  const marker = current.segmentMarkers.find((entry) => entry.id === markerId);
  if (!marker || marker.locked) return current;
  return normalizeBassClip({
    ...current,
    generatorMeta: { ...current.generatorMeta, kind: 'manual' },
    segmentMarkers: current.segmentMarkers.filter((entry) => entry.id !== markerId),
  });
}

export function patchBassClipPitchMode(clip: BassClip, pitchSnapMode: BassPitchSnapMode, pitchGuideKind?: BassPitchGuideKind): BassClip {
  return normalizeBassClip({
    ...clip,
    pitchSnapMode: normalizePitchSnapMode(pitchSnapMode),
    pitchGuideKind: normalizePitchGuideKind(pitchGuideKind ?? clip.pitchGuideKind),
  });
}

function makeSeededRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickWeighted<T>(rng: () => number, values: Array<{ value: T; weight: number }>): T {
  const total = values.reduce((sum, entry) => sum + Math.max(0, entry.weight), 0) || 1;
  let cursor = rng() * total;
  for (const entry of values) {
    cursor -= Math.max(0, entry.weight);
    if (cursor <= 0) return entry.value;
  }
  return values[values.length - 1].value;
}

export function randomizeBassClipEvents(clip: BassClip, args: { character?: BassRandomCharacter; seed?: number } = {}): BassClip {
  const current = normalizeBassClip(clip);
  const seed = Math.round(args.seed ?? (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)));
  const rng = makeSeededRng(seed);
  const character = args.character ?? 'frei';
  const segmentSteps = current.segmentMarkers.map((marker) => marker.step).sort((a, b) => a - b);
  const boundaries = Array.from(new Set([0, ...segmentSteps, current.stepCount].map((value) => Number(value.toFixed(3))))).filter((value) => value >= 0 && value <= current.stepCount).sort((a, b) => a - b);
  const regions = boundaries.slice(0, -1).map((start, index) => ({ start, end: boundaries[index + 1] })).filter((region) => region.end - region.start >= 0.25);
  const densityBase = character === 'sparsam' ? 0.55 : character === 'dicht' || character === 'psy' ? 1.25 : character === 'kick-nah' ? 0.85 : 0.95;
  const eventTarget = clamp(Math.round(Math.max(1, regions.length * densityBase + current.bars * (character === 'dicht' ? 4 : 1.5))), 1, Math.min(96, current.stepCount * 2));
  const ratioPool = character === 'psy'
    ? [1, 1, 1, 0.5, 1.5, 2]
    : character === 'forge'
      ? [1, 16 / 15, 9 / 8, 6 / 5, 4 / 3, 3 / 2, 7 / 4, 2]
      : character === 'kick-nah'
        ? [1, 1, 1, 0.5, 3 / 2, 2]
        : [1, 16 / 15, 9 / 8, 6 / 5, 5 / 4, 4 / 3, 3 / 2, 7 / 4, 2];
  const driftMax = character === 'psy' ? 5 : character === 'sparsam' ? 8 : character === 'forge' ? 18 : 24;
  const occupied: number[] = [];
  const events: BassEvent[] = [];
  const starts = regions.length ? regions : [{ start: 0, end: current.stepCount }];
  for (let index = 0; index < eventTarget; index += 1) {
    const region = starts[Math.floor(rng() * starts.length)] ?? starts[0];
    const role = pickWeighted(rng, [
      { value: 'anchor', weight: character === 'kick-nah' ? 4 : 2 },
      { value: 'answer', weight: character === 'sparsam' ? 0.7 : 1.4 },
      { value: 'ghost', weight: character === 'dicht' || character === 'psy' ? 2.2 : 0.9 },
      { value: 'leap', weight: character === 'forge' ? 1.5 : 0.8 },
    ] as Array<{ value: 'anchor' | 'answer' | 'ghost' | 'leap'; weight: number }>);
    const anchorBias = role === 'anchor' ? 0 : role === 'answer' ? 0.42 : role === 'ghost' ? 0.66 : rng();
    const span = region.end - region.start;
    let startStep = region.start + span * (anchorBias * 0.65 + rng() * 0.35);
    startStep = Math.round(startStep * 4) / 4;
    if (occupied.some((value) => Math.abs(value - startStep) < 0.24)) startStep = clamp(startStep + 0.5 + rng() * 0.5, 0, current.stepCount - 0.1);
    occupied.push(startStep);
    const baseRatio = ratioPool[Math.floor(rng() * ratioPool.length)] ?? 1;
    const driftDirection = role === 'anchor' ? -0.3 : role === 'answer' ? 0.2 : rng() * 2 - 1;
    const driftCents = (rng() * 2 - 1 + driftDirection) * driftMax;
    const ratioFromRoot = clamp(baseRatio * centsToRatio(driftCents), MIN_BASS_RATIO_FROM_ROOT, 32);
    const ghost = role === 'ghost' || (character === 'psy' && rng() > 0.72);
    const durationSteps = clamp(role === 'anchor' ? 0.75 + rng() * 1.5 : ghost ? 0.18 + rng() * 0.55 : 0.35 + rng() * 1.1, MIN_BASS_EVENT_DURATION_STEPS, Math.max(1, span));
    events.push(normalizeBassEvent({
      id: stableId('rand', seed, index, Math.round(startStep * 100)),
      startStep,
      durationSteps,
      ratioFromRoot,
      octave: baseRatio < 0.75 ? -1 : 0,
      velocity: ghost ? 0.34 + rng() * 0.26 : 0.62 + rng() * 0.42,
      accent: ghost ? 0.32 + rng() * 0.24 : 0.62 + rng() * 0.46,
      ghost,
      glide: (character === 'psy' || character === 'forge') && rng() > 0.76 ? { mode: 'bend-up' } : undefined,
      source: { generatorKind: 'manual', originalPitchKind: 'ratio', presetId: 'randomized', style: character },
    }, current.stepCount));
  }
  return normalizeBassClip({
    ...current,
    id: stableId('bass-clip', 'workcopy', 'random', seed.toString(36)),
    name: `${current.name.replace(/ · Zufall \d+$/, '')} · Zufall ${String(seed >>> 0).slice(-4)}`,
    events,
    generatorMeta: { ...current.generatorMeta, kind: 'manual', seed, style: character, presetId: 'randomized' },
  });
}


export function patchBassClipRootBinding(clip: BassClip, rootBinding: BassRootBinding, rootHz?: number): BassClip {
  return normalizeBassClip({
    ...clip,
    generatorMeta: {
      ...clip.generatorMeta,
      kind: 'manual',
      rootBinding: normalizeBassRootBinding(rootBinding),
      rootHz: Number.isFinite(rootHz ?? NaN) && (rootHz ?? 0) > 0 ? rootHz : clip.generatorMeta.rootHz,
    },
  });
}

export function patchBassClipTimingKind(clip: BassClip, timingKind: BassClipTimingKind): BassClip {
  return normalizeBassClip({
    ...clip,
    generatorMeta: {
      ...clip.generatorMeta,
      timingKind,
    },
  });
}


export function createBassClipEvent(clip: BassClip, seed?: Partial<BassEvent>): BassClip {
  const sourceRatio = seed?.ratioFromRoot ?? clip.events[0]?.ratioFromRoot ?? 1;
  const event: BassEvent = normalizeBassEvent({
    id: stableId('manual', Date.now().toString(36), Math.floor(Math.random() * 1000000).toString(36)),
    startStep: seed?.startStep ?? 0,
    durationSteps: clampBassDurationSteps(seed?.durationSteps ?? 1, clip.stepCount),
    ratioFromRoot: clamp(sourceRatio, MIN_BASS_RATIO_FROM_ROOT, 32),
    octave: seed?.octave ?? 0,
    velocity: seed?.velocity ?? 0.78,
    accent: seed?.accent ?? 0.72,
    ghost: seed?.ghost,
    tie: seed?.tie,
    glide: seed?.glide,
    source: { generatorKind: 'manual', originalPitchKind: 'ratio' },
  }, clip.stepCount);
  return normalizeBassClip({
    ...clip,
    generatorMeta: { ...clip.generatorMeta, kind: 'manual' },
    events: [...clip.events, event],
  });
}

export function removeBassClipEvent(clip: BassClip, eventId: string): BassClip {
  if (!eventId) return normalizeBassClip(clip);
  const nextEvents = clip.events.filter((event) => event.id !== eventId);
  return normalizeBassClip({
    ...clip,
    generatorMeta: { ...clip.generatorMeta, kind: 'manual' },
    events: nextEvents,
  });
}

export function patchBassClipEvent(clip: BassClip, eventId: string, patch: Partial<BassEvent>): BassClip {
  return normalizeBassClip({
    ...clip,
    events: clip.events.map((event) => event.id === eventId ? { ...event, ...patch } : event),
  });
}

function resolveBassClipEventTime(clip: BassClip, localStep: number, time: number) {
  const timingKind = clip.generatorMeta.timingKind ?? (clip.generatorMeta.flavor ? 'rhythmforge' : 'straight');
  if (timingKind === 'rhythmforge') {
    const swing = clamp(clip.generatorMeta.swing ?? 0.5, 0, 1);
    const softSwing = (swing - 0.5) * 0.032;
    const hostEquivalentStep = Math.floor((localStep / Math.max(1, clip.stepsPerBar)) * 16);
    const push = hostEquivalentStep % 2 === 1 ? softSwing : -softSwing * 0.3;
    return Math.max(0, time + push);
  }
  if (timingKind === 'psybass') {
    const swing = clamp(clip.generatorMeta.swing ?? 0, 0, 1);
    const softSwing = swing * 0.028;
    const hostEquivalentStep = Math.floor((localStep / Math.max(1, clip.stepsPerBar)) * 16);
    const push = hostEquivalentStep % 2 === 1 ? softSwing : -softSwing * 0.18;
    return Math.max(0, time + push);
  }
  return time;
}

export function scheduleBassClipStep(args: {
  clip: BassClip;
  step: number;
  time: number;
  rootHz: number;
  bassLevel: number;
  quantizeBpm: number;
  playBassNote: (time: number, freq: number, vol: number, dur: number, accent?: number, extras?: { glideToNext?: boolean; ghost?: boolean }) => void;
}) {
  const { clip, step, time, rootHz, bassLevel, quantizeBpm, playBassNote } = args;
  const normalized = normalizeBassClip(clip);
  const hostStepsPerBar = 16;
  const hostCycleSteps = Math.max(1, normalized.bars * hostStepsPerBar);
  const hostStep = ((step % hostCycleSteps) + hostCycleSteps) % hostCycleSteps;
  const rangeStart = (hostStep / hostCycleSteps) * normalized.stepCount;
  const rangeEnd = ((hostStep + 1) / hostCycleSteps) * normalized.stepCount;
  const rangeSpan = Math.max(0.0001, rangeEnd - rangeStart);
  const stepBase = 60 / Math.max(40, quantizeBpm) / 4;
  normalized.events.forEach((event) => {
    const eventStep = ((event.startStep % normalized.stepCount) + normalized.stepCount) % normalized.stepCount;
    const inRange = hostStep === hostCycleSteps - 1
      ? eventStep >= rangeStart && eventStep < normalized.stepCount
      : eventStep >= rangeStart && eventStep < rangeEnd;
    if (!inRange) return;
    const eventOffset = clamp((eventStep - rangeStart) / rangeSpan, 0, 0.999) * stepBase;
    const scheduledTime = resolveBassClipEventTime(normalized, eventStep, time + eventOffset);
    const freq = resolveBassEventFrequencyHz(event, Number.isFinite(rootHz) && rootHz > 0 ? rootHz : normalized.generatorMeta.rootHz ?? 49);
    const dur = stepBase * (hostCycleSteps / normalized.stepCount) * clampBassDurationSteps(event.durationSteps, normalized.stepCount);
    const eventGain = bassLevel * clamp(event.velocity ?? 1, 0, 1.5);
    playBassNote(scheduledTime, freq, eventGain, dur, event.accent, { glideToNext: !!event.glide && event.glide.mode !== 'none', ghost: event.ghost });
  });
}
