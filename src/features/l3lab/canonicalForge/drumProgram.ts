import { clampDrumSegmentsPerBar, sanitizeDrumSegmentMarkers, stepIndexToGlobalRatio } from '../../xensonar/drumGrid';
import type { DrumLaneId } from '../../xensonar/drumPatternMachineTypes';
import type { DrumKit } from '../../xensonar/domain/instrumentData';
import type { DrumLaneKitOverrides } from '../../xensonar/groove/drumKitRoutingTypes';
import { sanitizeDrumLaneKitOverrides } from '../../xensonar/groove/drumKitRouting';
import type { DrumLaneMixSettings, DrumLaneSettingsMap } from '../../xensonar/groove/drumLaneSettings';
import { cloneDrumLaneSettingsMap, DEFAULT_DRUM_LANE_SETTINGS, resolveDrumLaneSettings, sanitizeDrumLaneSettings } from '../../xensonar/groove/drumLaneSettings';

export type DrumProgramLaneId = DrumLaneId;

export type DrumStepLayerProgram = {
  id: string;
  active: boolean;
  kit?: DrumKit;
  levelScale: number;
  decayScale: number;
  panOffset: number;
  gradient: number;
};

export type DrumStepProgram = {
  laneId: DrumProgramLaneId;
  stepIndex: number;
  value: number;
  microOffsetRatio: number;
  layers: DrumStepLayerProgram[];
};

export type DrumStepProgramMap = Partial<Record<DrumProgramLaneId, Record<number, DrumStepProgram>>>;

export type DrumProgram = {
  presetSource: string;
  globalKit: string;
  bars: number;
  segmentsPerBar: number;
  segmentMarkers: number[];
  stepCount: number;
  laneOrder: DrumProgramLaneId[];
  laneSteps: Record<DrumProgramLaneId, number[]>;
  laneKitOverrides: DrumLaneKitOverrides;
  laneSettings: DrumLaneSettingsMap;
  stepPrograms: DrumStepProgramMap;
};

export type DrumProgramEvent = {
  laneId: DrumProgramLaneId;
  stepIndex: number;
  value: number;
  startRatio: number;
  laneSettings: DrumLaneMixSettings;
  kit?: DrumKit;
  layers: DrumStepLayerProgram[];
};

const DRUM_LANE_IDS: DrumProgramLaneId[] = ['kick', 'snare', 'hatClosed', 'hatOpen', 'clap', 'perc'];
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const finiteOr = (value: unknown, fallback: number) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);

function sanitizeLayer(raw: unknown, index: number): DrumStepLayerProgram | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Record<string, unknown>;
  const active = candidate.active !== false;
  return {
    id: typeof candidate.id === 'string' && candidate.id.trim() ? candidate.id : `layer-${index + 1}`,
    active,
    kit: typeof candidate.kit === 'string' && candidate.kit.trim() ? (candidate.kit as DrumKit) : undefined,
    levelScale: clamp(finiteOr(candidate.levelScale, 1), 0, 2),
    decayScale: clamp(finiteOr(candidate.decayScale, 1), 0.2, 3),
    panOffset: clamp(finiteOr(candidate.panOffset, 0), -1, 1),
    gradient: clamp(finiteOr(candidate.gradient, 0), -1, 1),
  };
}

function defaultStepProgram(args: { laneId: DrumProgramLaneId; stepIndex: number; value: number }): DrumStepProgram {
  return {
    laneId: args.laneId,
    stepIndex: args.stepIndex,
    value: clamp(finiteOr(args.value, 0), 0, 1.25),
    microOffsetRatio: 0,
    layers: [
      {
        id: 'primary',
        active: true,
        levelScale: 1,
        decayScale: 1,
        panOffset: 0,
        gradient: 0,
      },
    ],
  };
}

function sanitizeStepProgram(raw: unknown, laneId: DrumProgramLaneId, stepIndex: number, fallbackValue: number): DrumStepProgram {
  if (!raw || typeof raw !== 'object') return defaultStepProgram({ laneId, stepIndex, value: fallbackValue });
  const candidate = raw as Record<string, unknown>;
  const layers = Array.isArray(candidate.layers)
    ? candidate.layers.map((layer, index) => sanitizeLayer(layer, index)).filter(Boolean) as DrumStepLayerProgram[]
    : [];
  return {
    laneId,
    stepIndex,
    value: clamp(finiteOr(candidate.value, fallbackValue), 0, 1.25),
    microOffsetRatio: clamp(finiteOr(candidate.microOffsetRatio, 0), -0.24, 0.24),
    layers: layers.length ? layers : defaultStepProgram({ laneId, stepIndex, value: fallbackValue }).layers,
  };
}

export function sanitizeDrumStepPrograms(value: unknown, args: { laneOrder?: DrumProgramLaneId[]; laneSteps?: Partial<Record<DrumProgramLaneId, number[]>>; stepCount?: number } = {}): DrumStepProgramMap {
  const laneOrder = args.laneOrder?.length ? args.laneOrder : DRUM_LANE_IDS;
  const laneSteps = args.laneSteps ?? {};
  const stepCount = Math.max(1, Math.round(args.stepCount ?? Math.max(...laneOrder.map((laneId) => laneSteps[laneId]?.length ?? 0), 16)));
  if (!value || typeof value !== 'object') return {};
  const source = value as Record<string, unknown>;
  const result: DrumStepProgramMap = {};
  laneOrder.forEach((laneId) => {
    const laneRaw = source[laneId];
    if (!laneRaw || typeof laneRaw !== 'object') return;
    const laneSource = laneRaw as Record<string, unknown>;
    const lanePrograms: Record<number, DrumStepProgram> = {};
    Object.entries(laneSource).forEach(([stepKey, stepValue]) => {
      const stepIndex = Math.max(0, Math.min(stepCount - 1, Math.round(Number(stepKey))));
      if (!Number.isFinite(stepIndex)) return;
      const fallbackValue = laneSteps[laneId]?.[stepIndex] ?? 0;
      lanePrograms[stepIndex] = sanitizeStepProgram(stepValue, laneId, stepIndex, fallbackValue);
    });
    if (Object.keys(lanePrograms).length) result[laneId] = lanePrograms;
  });
  return result;
}

export function cloneDrumStepPrograms(value?: DrumStepProgramMap | null): DrumStepProgramMap {
  if (!value) return {};
  const result: DrumStepProgramMap = {};
  DRUM_LANE_IDS.forEach((laneId) => {
    const lanePrograms = value[laneId];
    if (!lanePrograms) return;
    result[laneId] = Object.fromEntries(
      Object.entries(lanePrograms).map(([stepKey, program]) => [
        Number(stepKey),
        {
          ...program,
          laneId,
          stepIndex: Number(stepKey),
          layers: (program.layers ?? []).map((layer) => ({ ...layer })),
        },
      ]),
    );
  });
  return result;
}

export function pruneDrumStepPrograms(value: DrumStepProgramMap | undefined | null, args: { laneOrder: DrumProgramLaneId[]; stepCount: number }): DrumStepProgramMap {
  const stepCount = Math.max(1, Math.round(args.stepCount || 1));
  const sanitized = sanitizeDrumStepPrograms(value, { laneOrder: args.laneOrder, stepCount });
  const result: DrumStepProgramMap = {};
  args.laneOrder.forEach((laneId) => {
    const lanePrograms = sanitized[laneId];
    if (!lanePrograms) return;
    const filtered = Object.fromEntries(
      Object.entries(lanePrograms)
        .filter(([stepKey]) => Number(stepKey) >= 0 && Number(stepKey) < stepCount)
        .map(([stepKey, program]) => [Number(stepKey), { ...program, laneId, stepIndex: Number(stepKey), layers: (program.layers ?? []).map((layer) => ({ ...layer })) }]),
    );
    if (Object.keys(filtered).length) result[laneId] = filtered;
  });
  return result;
}

export function createDrumProgram(args: {
  presetSource: string;
  globalKit: string;
  bars: number;
  segmentsPerBar: number;
  segmentMarkers: number[];
  stepCount: number;
  laneOrder: DrumProgramLaneId[];
  laneSteps: Record<DrumProgramLaneId, number[]>;
  laneKitOverrides?: DrumLaneKitOverrides | null;
  laneSettings?: DrumLaneSettingsMap | null;
  stepPrograms?: DrumStepProgramMap | null;
}): DrumProgram {
  const bars = Math.max(1, Math.round(args.bars || 1));
  const segmentsPerBar = clampDrumSegmentsPerBar(args.segmentsPerBar || Math.round(args.stepCount / bars) || 16);
  const stepCount = Math.max(segmentsPerBar, Math.round(args.stepCount || bars * segmentsPerBar));
  const laneOrder = args.laneOrder?.length ? [...args.laneOrder] : [...DRUM_LANE_IDS];
  const laneSteps = Object.fromEntries(laneOrder.map((laneId) => [laneId, Array.from({ length: stepCount }, (_, index) => args.laneSteps?.[laneId]?.[index] ?? 0)])) as Record<DrumProgramLaneId, number[]>;
  return {
    presetSource: args.presetSource || 'custom',
    globalKit: args.globalKit || 'dusty_tape',
    bars,
    segmentsPerBar,
    segmentMarkers: sanitizeDrumSegmentMarkers(args.segmentMarkers, segmentsPerBar),
    stepCount,
    laneOrder,
    laneSteps,
    laneKitOverrides: sanitizeDrumLaneKitOverrides(args.laneKitOverrides),
    laneSettings: cloneDrumLaneSettingsMap(sanitizeDrumLaneSettings(args.laneSettings)),
    stepPrograms: sanitizeDrumStepPrograms(args.stepPrograms, { laneOrder, laneSteps, stepCount }),
  };
}

export function cloneDrumProgram(program: DrumProgram): DrumProgram {
  return createDrumProgram({
    presetSource: program.presetSource,
    globalKit: program.globalKit,
    bars: program.bars,
    segmentsPerBar: program.segmentsPerBar,
    segmentMarkers: [...program.segmentMarkers],
    stepCount: program.stepCount,
    laneOrder: [...program.laneOrder],
    laneSteps: Object.fromEntries(program.laneOrder.map((laneId) => [laneId, [...(program.laneSteps[laneId] ?? [])]])) as Record<DrumProgramLaneId, number[]>,
    laneKitOverrides: { ...program.laneKitOverrides },
    laneSettings: cloneDrumLaneSettingsMap(program.laneSettings),
    stepPrograms: cloneDrumStepPrograms(program.stepPrograms),
  });
}

export function resolveDrumProgramStep(program: DrumProgram, laneId: DrumProgramLaneId, stepIndex: number): DrumStepProgram {
  const fallbackValue = program.laneSteps[laneId]?.[stepIndex] ?? 0;
  return sanitizeStepProgram(program.stepPrograms?.[laneId]?.[stepIndex], laneId, stepIndex, fallbackValue);
}

export function forEachDrumProgramEvent(program: DrumProgram, callback: (event: DrumProgramEvent) => void) {
  program.laneOrder.forEach((laneId) => {
    const laneSettings = resolveDrumLaneSettings({ laneId, laneSettings: program.laneSettings });
    const laneSteps = program.laneSteps[laneId] ?? [];
    laneSteps.forEach((value, stepIndex) => {
      if (value <= 0) return;
      const stepProgram = resolveDrumProgramStep(program, laneId, stepIndex);
      callback({
        laneId,
        stepIndex,
        value: stepProgram.value,
        startRatio: stepIndexToGlobalRatio(stepIndex, program.bars, program.segmentsPerBar, program.segmentMarkers, 'start') + stepProgram.microOffsetRatio / Math.max(1, program.stepCount),
        laneSettings,
        kit: program.laneKitOverrides[laneId],
        layers: stepProgram.layers.length ? stepProgram.layers : defaultStepProgram({ laneId, stepIndex, value: stepProgram.value }).layers,
      });
    });
  });
}

export function forEachDrumProgramEventInWindow(program: DrumProgram, args: { windowStartRatio: number; windowEndRatio: number }, callback: (event: DrumProgramEvent) => void) {
  const normalizedStart = ((args.windowStartRatio % 1) + 1) % 1;
  const normalizedEnd = ((args.windowEndRatio % 1) + 1) % 1;
  const wrapped = normalizedEnd < normalizedStart || Math.abs(normalizedEnd - normalizedStart) < 1e-9;
  forEachDrumProgramEvent(program, (event) => {
    const ratio = ((event.startRatio % 1) + 1) % 1;
    const inWindow = wrapped
      ? ratio >= normalizedStart || ratio < normalizedEnd
      : ratio >= normalizedStart && ratio < normalizedEnd;
    if (inWindow) callback({ ...event, startRatio: ratio });
  });
}

export function mergeProgramLaneSettings(primary?: DrumLaneSettingsMap | null, secondary?: DrumLaneSettingsMap | null): DrumLaneSettingsMap {
  return cloneDrumLaneSettingsMap({ ...cloneDrumLaneSettingsMap(secondary ?? DEFAULT_DRUM_LANE_SETTINGS), ...cloneDrumLaneSettingsMap(primary ?? DEFAULT_DRUM_LANE_SETTINGS) });
}
