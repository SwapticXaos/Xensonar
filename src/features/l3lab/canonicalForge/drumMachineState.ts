import { buildDefaultDrumSegmentMarkers, clampDrumSegmentsPerBar, sanitizeDrumSegmentMarkers } from '../../xensonar/drumGrid';
import { buildVisibleDrumPatternMatrix } from '../../xensonar/drumPatternMachine';
import type { DrumPattern } from '../../xensonar/domain/instrumentData';
import {
  cloneDrumComputerState,
  createEmptyDrumComputer,
  drumPatternMatrixToState,
  resizeDrumComputerState,
  type DrumComputerState,
  type DrumVoiceId,
} from './loopDrumDomain';
import type { DrumStepProgramMap } from './drumProgram';

export type DrumExportMatrix = {
  pattern: DrumPattern;
  bars: number;
  segmentsPerBar: number;
  segmentMarkers: number[];
  stepCount: number;
  laneOrder: DrumVoiceId[];
  laneSteps: Record<DrumVoiceId, number[]>;
  stepPrograms?: DrumStepProgramMap;
  sourceKind: 'static';
};

export function buildPresetBackedDrumComputer(pattern: string, bars: number, segmentsPerBar: number, segmentMarkers?: number[]): DrumComputerState {
  const safeBars = Math.max(1, Math.round(bars || 1));
  const safeSegmentsPerBar = clampDrumSegmentsPerBar(segmentsPerBar || 16);
  const safeMarkers = sanitizeDrumSegmentMarkers(segmentMarkers, safeSegmentsPerBar);
  const matrix = buildVisibleDrumPatternMatrix({
    pattern: pattern as DrumPattern,
    bars: safeBars,
    segmentsPerBar: safeSegmentsPerBar,
    segmentMarkers: safeMarkers,
  });
  return drumPatternMatrixToState(pattern, matrix, false);
}

export function applyDrumStepValueToState(
  state: DrumComputerState,
  visibleDrumComputer: DrumComputerState,
  groovePattern: string,
  laneId: DrumVoiceId,
  step: number,
  value: number,
): DrumComputerState {
  const next = cloneDrumComputerState(state.useCustom ? state : visibleDrumComputer);
  next.useCustom = true;
  next.presetSource = groovePattern;
  const lane = [...(next.laneSteps[laneId] ?? [])];
  lane[step] = value;
  next.laneSteps[laneId] = lane;
  return next;
}

export function applyDrumMarkerRatioToState(
  state: DrumComputerState,
  visibleDrumComputer: DrumComputerState,
  groovePattern: string,
  markerIndex: number,
  localRatio: number,
): DrumComputerState {
  const next = cloneDrumComputerState(state.useCustom ? state : visibleDrumComputer);
  next.useCustom = true;
  next.presetSource = groovePattern;
  const markers = sanitizeDrumSegmentMarkers(next.segmentMarkers, next.segmentsPerBar);
  markers[markerIndex] = localRatio;
  next.segmentMarkers = sanitizeDrumSegmentMarkers(markers, next.segmentsPerBar);
  return next;
}

export function resizeDrumComputerBars(
  state: DrumComputerState,
  groovePattern: string,
  nextBars: number,
): DrumComputerState {
  if (!state.useCustom) {
    return buildPresetBackedDrumComputer(groovePattern, nextBars, state.segmentsPerBar, state.segmentMarkers);
  }
  return cloneDrumComputerState(resizeDrumComputerState(state, nextBars, state.segmentsPerBar, state.segmentMarkers));
}

export function resizeDrumComputerSegments(
  state: DrumComputerState,
  visibleDrumComputer: DrumComputerState,
  groovePattern: string,
  bars: number,
  segmentsPerBar: number,
): DrumComputerState {
  const base = state.useCustom ? state : visibleDrumComputer;
  const resized = resizeDrumComputerState(base, bars, segmentsPerBar, buildDefaultDrumSegmentMarkers(segmentsPerBar));
  return state.useCustom
    ? { ...resized, useCustom: true, presetSource: state.presetSource || groovePattern }
    : buildPresetBackedDrumComputer(groovePattern, bars, segmentsPerBar, resized.segmentMarkers);
}

export function buildResetDrumComputerToPreset(
  groovePattern: string,
  bars: number,
  segmentsPerBar: number,
): DrumComputerState {
  return buildPresetBackedDrumComputer(groovePattern, bars, segmentsPerBar, buildDefaultDrumSegmentMarkers(segmentsPerBar));
}

export function buildRandomizedDrumComputer(
  state: DrumComputerState,
  visibleDrumComputer: DrumComputerState,
  groovePattern: string,
  bars: number,
): DrumComputerState {
  const base = state.useCustom ? state : visibleDrumComputer;
  const next = cloneDrumComputerState(resizeDrumComputerState(base, bars, base.segmentsPerBar, base.segmentMarkers));
  next.useCustom = true;
  next.presetSource = groovePattern;
  next.laneOrder.forEach((laneId) => {
    next.laneSteps[laneId] = next.laneSteps[laneId].map((_, index) => {
      const local = index % next.segmentsPerBar;
      const normalized = next.segmentsPerBar > 1 ? local / next.segmentsPerBar : 0;
      const strong = normalized < 0.05 || Math.abs(normalized - 0.5) < 0.08;
      const nearQuarter = Math.min(Math.abs(normalized - 0.25), Math.abs(normalized - 0.75)) < 0.08;
      const chance = laneId === 'kick'
        ? (strong ? 0.42 : 0.12)
        : laneId === 'snare'
          ? (nearQuarter ? 0.5 : 0.08)
          : laneId === 'hatClosed'
            ? 0.36
            : laneId === 'hatOpen'
              ? 0.08
              : laneId === 'clap'
                ? 0.08
                : 0.14;
      if (Math.random() > chance) return 0;
      return Math.random() > 0.74 ? 1 : Math.random() > 0.45 ? 0.86 : 0.62;
    });
  });
  return next;
}

export function buildClearedDrumComputer(
  state: DrumComputerState,
  groovePattern: string,
  bars: number,
): DrumComputerState {
  return {
    ...createEmptyDrumComputer(bars, state.segmentsPerBar, state.segmentMarkers),
    useCustom: true,
    presetSource: state.presetSource || groovePattern,
  };
}

export function buildDrumExportMatrix(visibleDrumComputer: DrumComputerState, pattern: string): DrumExportMatrix {
  return {
    pattern: (pattern || 'broken_lilt') as DrumPattern,
    bars: visibleDrumComputer.bars,
    segmentsPerBar: visibleDrumComputer.segmentsPerBar,
    segmentMarkers: [...visibleDrumComputer.segmentMarkers],
    stepCount: visibleDrumComputer.stepCount,
    laneOrder: [...visibleDrumComputer.laneOrder],
    laneSteps: Object.fromEntries(
      visibleDrumComputer.laneOrder.map((laneId) => [laneId, [...(visibleDrumComputer.laneSteps[laneId] ?? [])]]),
    ) as Record<DrumVoiceId, number[]>,
    stepPrograms: visibleDrumComputer.stepPrograms,
    sourceKind: 'static',
  };
}
