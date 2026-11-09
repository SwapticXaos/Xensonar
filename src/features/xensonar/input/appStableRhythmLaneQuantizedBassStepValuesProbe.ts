export type AppStableRhythmLaneQuantizedBassStepValuesProbeArgs = {
  readonly absoluteStep: number;
  readonly step16: number;
  readonly timeSec: number;
  readonly bassLevel: number;
  readonly rootHz: number;
  readonly readQuantizeBpm: () => number;
  readonly schedulingStillBoundaryOwned: true;
  readonly playBassNoteStillActionPortOwned: true;
};

export type AppStableRhythmLaneQuantizedBassStepValues = {
  readonly absoluteStep: number;
  readonly step16: number;
  readonly timeSec: number;
  readonly bassLevel: number;
  readonly rootHz: number;
  readonly quantizeBpm: number;
};

export type AppStableRhythmLaneQuantizedBassStepValuesProbeResult = {
  readonly probeKind: 'app-stable-rhythm-lane-quantized-bass-step-values-probe';
  readonly values: AppStableRhythmLaneQuantizedBassStepValues;
  readonly schedulingStillBoundaryOwned: true;
  readonly playBassNoteStillActionPortOwned: true;
  readonly runtimeOwned: false;
};

export const buildAppStableRhythmLaneQuantizedBassStepValuesProbe = (
  args: AppStableRhythmLaneQuantizedBassStepValuesProbeArgs,
): AppStableRhythmLaneQuantizedBassStepValuesProbeResult => ({
  probeKind: 'app-stable-rhythm-lane-quantized-bass-step-values-probe',
  values: {
    absoluteStep: args.absoluteStep,
    step16: args.step16,
    timeSec: args.timeSec,
    bassLevel: args.bassLevel,
    rootHz: args.rootHz,
    quantizeBpm: args.readQuantizeBpm(),
  },
  schedulingStillBoundaryOwned: true,
  playBassNoteStillActionPortOwned: true,
  runtimeOwned: false,
});
