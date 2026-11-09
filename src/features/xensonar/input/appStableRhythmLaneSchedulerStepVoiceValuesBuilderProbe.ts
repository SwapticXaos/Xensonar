import type { DrumStyle } from '../../resonance/drumMachine';
import type { DrumKit } from '../domain/instrumentData';
import type { DrumLaneKitOverrides } from '../groove/drumKitRoutingTypes';

export type AppStableRhythmLaneSchedulerDrumStepVoiceValues = {
  readonly drumLevel: number;
  readonly drumKit: DrumKit;
  readonly drumStyle: DrumStyle;
  readonly drumLaneKitOverrides: DrumLaneKitOverrides;
  readonly stepDurationSec: number;
};

export type AppStableRhythmLaneSchedulerBassStepVoiceValues = {
  readonly bassLevel: number;
  readonly bassGrit: number;
  readonly rootHz: number;
  readonly stepDurationSec: number;
};

export type AppStableRhythmLaneSchedulerDrumStepVoiceValuesBuilderProbeResult = {
  readonly probeKind: 'app-stable-rhythm-lane-scheduler-drum-step-voice-values-builder-probe';
  readonly values: AppStableRhythmLaneSchedulerDrumStepVoiceValues;
  readonly schedulingStillBoundaryOwned: true;
  readonly audioOwned: false;
  readonly runtimeOwned: false;
};

export type AppStableRhythmLaneSchedulerBassStepVoiceValuesBuilderProbeResult = {
  readonly probeKind: 'app-stable-rhythm-lane-scheduler-bass-step-voice-values-builder-probe';
  readonly values: AppStableRhythmLaneSchedulerBassStepVoiceValues;
  readonly schedulingStillBoundaryOwned: true;
  readonly audioOwned: false;
  readonly runtimeOwned: false;
};

export const buildAppStableRhythmLaneSchedulerDrumStepVoiceValuesProbe = (args: {
  readonly drumLevel: number;
  readonly drumKit: DrumKit | null | undefined;
  readonly drumStyle: DrumStyle;
  readonly drumLaneKitOverrides: DrumLaneKitOverrides;
  readonly stepDurationSec: number;
  readonly schedulingStillBoundaryOwned: true;
}): AppStableRhythmLaneSchedulerDrumStepVoiceValuesBuilderProbeResult => ({
  probeKind: 'app-stable-rhythm-lane-scheduler-drum-step-voice-values-builder-probe',
  values: {
    drumLevel: args.drumLevel,
    drumKit: args.drumKit ?? 'dusty_tape',
    drumStyle: args.drumStyle,
    drumLaneKitOverrides: args.drumLaneKitOverrides,
    stepDurationSec: args.stepDurationSec,
  },
  schedulingStillBoundaryOwned: true,
  audioOwned: false,
  runtimeOwned: false,
});

export const buildAppStableRhythmLaneSchedulerBassStepVoiceValuesProbe = (args: {
  readonly bassLevel: number;
  readonly bassGrit: number | null | undefined;
  readonly rootHz: number;
  readonly stepDurationSec: number;
  readonly schedulingStillBoundaryOwned: true;
}): AppStableRhythmLaneSchedulerBassStepVoiceValuesBuilderProbeResult => ({
  probeKind: 'app-stable-rhythm-lane-scheduler-bass-step-voice-values-builder-probe',
  values: {
    bassLevel: args.bassLevel,
    bassGrit: args.bassGrit ?? 0.18,
    rootHz: args.rootHz,
    stepDurationSec: args.stepDurationSec,
  },
  schedulingStillBoundaryOwned: true,
  audioOwned: false,
  runtimeOwned: false,
});
