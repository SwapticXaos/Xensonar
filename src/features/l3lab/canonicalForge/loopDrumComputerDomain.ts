import type { DrumPattern } from '../../xensonar/domain/instrumentData';
import { buildDefaultDrumSegmentMarkers, clampDrumSegmentsPerBar, sanitizeDrumSegmentMarkers } from '../../xensonar/drumGrid';
import { buildVisibleDrumPatternMatrix, createEmptyDrumPatternMatrix } from '../../xensonar/drumPatternMachine';
import { DEFAULT_DRUM_LANE_KIT_OVERRIDES, sanitizeDrumLaneKitOverrides } from '../../xensonar/groove/drumKitRouting';
import { cloneDrumLaneSettingsMap, DEFAULT_DRUM_LANE_SETTINGS, sanitizeDrumLaneSettings } from '../../xensonar/groove/drumLaneSettings';
import { cloneDrumStepPrograms, pruneDrumStepPrograms } from './drumProgram';
import type { DrumComputerHydrationState, DrumComputerState, DrumVoiceId, GrooveMachineConfig } from './loopDrumDomainTypes';

export const DEFAULT_GROOVE_MACHINE: GrooveMachineConfig = {
  drumPattern: 'broken_lilt',
  drumKit: 'dusty_tape',
  bassPattern: 'forge_fractured',
  barsInterpretation: 4,
  showGrid: true,
  drumLaneKitOverrides: { ...DEFAULT_DRUM_LANE_KIT_OVERRIDES },
  drumLaneSettings: cloneDrumLaneSettingsMap(DEFAULT_DRUM_LANE_SETTINGS),
};

export const DRUM_LANE_LABELS: Record<DrumVoiceId, string> = { kick: 'Kick', snare: 'Snare', hatClosed: 'Hat C', hatOpen: 'Hat O', clap: 'Clap', perc: 'Perc' };
export const DRUM_LANE_COLORS: Record<DrumVoiceId, string> = { kick: '#38bdf8', snare: '#f472b6', hatClosed: '#f59e0b', hatOpen: '#fbbf24', clap: '#c084fc', perc: '#34d399' };

export function drumPatternMatrixToState(pattern: string, matrix: ReturnType<typeof buildVisibleDrumPatternMatrix>, useCustom: boolean): DrumComputerState {
  return {
    useCustom,
    presetSource: pattern,
    bars: matrix.bars,
    segmentsPerBar: matrix.segmentsPerBar,
    segmentMarkers: [...matrix.segmentMarkers],
    stepCount: matrix.stepCount,
    laneOrder: [...matrix.laneOrder] as DrumVoiceId[],
    laneSteps: Object.fromEntries(matrix.laneOrder.map((laneId) => [laneId, [...(matrix.laneSteps[laneId] ?? [])]])) as Record<DrumVoiceId, number[]>,
    stepPrograms: {},
  };
}

export function createEmptyDrumComputer(bars = DEFAULT_GROOVE_MACHINE.barsInterpretation, segmentsPerBar = 16, segmentMarkers?: number[]): DrumComputerState {
  const safeSegmentsPerBar = clampDrumSegmentsPerBar(segmentsPerBar);
  const matrix = createEmptyDrumPatternMatrix(DEFAULT_GROOVE_MACHINE.drumPattern as DrumPattern, bars, safeSegmentsPerBar, segmentMarkers ?? buildDefaultDrumSegmentMarkers(safeSegmentsPerBar));
  return drumPatternMatrixToState(DEFAULT_GROOVE_MACHINE.drumPattern, matrix, false);
}

export function sanitizeGrooveMachineConfig(value: Partial<GrooveMachineConfig> | null | undefined): GrooveMachineConfig {
  return {
    ...DEFAULT_GROOVE_MACHINE,
    ...(value ?? {}),
    drumLaneKitOverrides: sanitizeDrumLaneKitOverrides((value as GrooveMachineConfig | null | undefined)?.drumLaneKitOverrides),
    drumLaneSettings: sanitizeDrumLaneSettings((value as GrooveMachineConfig | null | undefined)?.drumLaneSettings),
  };
}

export function cloneGrooveMachineConfig(value: GrooveMachineConfig): GrooveMachineConfig {
  const sanitized = sanitizeGrooveMachineConfig(value);
  return {
    ...sanitized,
    drumLaneKitOverrides: { ...sanitized.drumLaneKitOverrides },
    drumLaneSettings: cloneDrumLaneSettingsMap(sanitized.drumLaneSettings),
  };
}

export function cloneDrumComputerState(state: DrumComputerHydrationState): DrumComputerState {
  const safeBars = Math.max(1, state.bars || 1);
  const safeSegmentsPerBar = clampDrumSegmentsPerBar(state.segmentsPerBar || Math.round((state.stepCount || 16) / safeBars) || 16);
  return {
    useCustom: state.useCustom,
    presetSource: state.presetSource,
    bars: safeBars,
    segmentsPerBar: safeSegmentsPerBar,
    segmentMarkers: sanitizeDrumSegmentMarkers(state.segmentMarkers, safeSegmentsPerBar),
    stepCount: Math.max(safeSegmentsPerBar, Math.round(state.stepCount || safeBars * safeSegmentsPerBar)),
    laneOrder: [...state.laneOrder],
    laneSteps: Object.fromEntries(state.laneOrder.map((laneId) => [laneId, [...(state.laneSteps[laneId] ?? [])]])) as Record<DrumVoiceId, number[]>,
    stepPrograms: cloneDrumStepPrograms(state.stepPrograms),
  };
}

export function resizeDrumComputerState(state: DrumComputerState, bars: number, segmentsPerBar = state.segmentsPerBar, segmentMarkers = state.segmentMarkers) {
  const safeBars = Math.max(1, Math.round(bars || 1));
  const safeSegmentsPerBar = clampDrumSegmentsPerBar(segmentsPerBar || 16);
  const stepCount = safeBars * safeSegmentsPerBar;
  const next = cloneDrumComputerState(state);
  next.bars = safeBars;
  next.segmentsPerBar = safeSegmentsPerBar;
  next.segmentMarkers = sanitizeDrumSegmentMarkers(segmentMarkers, safeSegmentsPerBar);
  next.stepCount = stepCount;
  next.laneOrder.forEach((laneId) => {
    const current = next.laneSteps[laneId] ?? [];
    next.laneSteps[laneId] = Array.from({ length: stepCount }, (_, index) => current[index] ?? 0);
  });
  next.stepPrograms = pruneDrumStepPrograms(next.stepPrograms, { laneOrder: next.laneOrder, stepCount });
  return next;
}

export function cycleDrumCellValue(value: number) {
  if (value <= 0) return 0.62;
  if (value < 0.8) return 0.86;
  if (value < 0.97) return 1;
  return 0;
}


export function countActiveDrumSteps(state: DrumComputerState) {
  return state.laneOrder.reduce((sum, laneId) => sum + (state.laneSteps[laneId] ?? []).filter((value) => value > 0).length, 0);
}
