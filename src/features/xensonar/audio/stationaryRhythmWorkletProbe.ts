import type { StationaryRhythmWorkletProbeOptions } from './stationaryRhythmWorkletLaneContracts';

export const DEFAULT_STATIONARY_RHYTHM_WORKLET_PROBE_OPTIONS: Required<StationaryRhythmWorkletProbeOptions> = {
  bpm: 108,
  beatsPerBar: 4,
  stepsPerBar: 16,
  probeGain: 0.035,
  audibleProbe: true,
};

export const resolveStationaryRhythmProbeOptions = (
  bpm: number,
  overrides: Partial<StationaryRhythmWorkletProbeOptions> = {},
): Required<StationaryRhythmWorkletProbeOptions> => ({
  ...DEFAULT_STATIONARY_RHYTHM_WORKLET_PROBE_OPTIONS,
  ...overrides,
  bpm: Number.isFinite(bpm) ? Math.max(12, Math.min(360, bpm)) : DEFAULT_STATIONARY_RHYTHM_WORKLET_PROBE_OPTIONS.bpm,
});

export const summarizeStationaryRhythmProbeStatus = (input: {
  status: string;
  probeRunning: boolean;
  currentBar: number;
  stepIndex: number;
  frameContinuityGapCount: number;
  lateStepCount: number;
  missedStepWindowCount: number;
  processorErrorCount: number;
}) => {
  if (input.processorErrorCount > 0) return 'processorerror';
  if (!input.probeRunning) return input.status;
  const gaps = input.frameContinuityGapCount + input.lateStepCount + input.missedStepWindowCount;
  return gaps > 0
    ? `Probe läuft · Bar ${input.currentBar + 1} · Step ${input.stepIndex + 1} · Gaps ${gaps}`
    : `Probe läuft · Bar ${input.currentBar + 1} · Step ${input.stepIndex + 1}`;
};
