import type { DrumConfigEntry } from '../drumConfigLibraryTypes';
import { resolveAppStableRhythmLaneSchedulerBassStepBranchProbe } from './appStableRhythmLaneSchedulerBassStepBranchClassifierProbe';
import { resolveAppStableRhythmLaneSchedulerDrumStepBranchProbe } from './appStableRhythmLaneSchedulerDrumStepBranchClassifierProbe';
import { buildAppStableRhythmLaneRunnerCallPlanStepFromContractProbe } from './appStableRhythmLaneRunnerCallPlanContractRegistryProbe';
import type { AppStableRhythmLaneRunnerCallPlanStep } from './appStableRhythmLaneRunnerCallPlanContractRegistryProbe';
import type { AppStableRhythmLaneStepExecutionFrameProbe } from './appStableRhythmLaneStepExecutionFrameProbe';


export type {
  AppStableRhythmLaneRunnerCallPlanCacheContract,
  AppStableRhythmLaneRunnerCallPlanContractDomain,
  AppStableRhythmLaneRunnerCallPlanSchedulerCall,
  AppStableRhythmLaneRunnerCallPlanStep,
} from './appStableRhythmLaneRunnerCallPlanContractRegistryProbe';

export type AppStableRhythmLaneRunnerCallPlanProbe = {
  readonly probeKind: 'app-stable-rhythm-lane-runner-call-plan-probe';
  readonly step16: number;
  readonly barIndex: number;
  readonly calls: readonly AppStableRhythmLaneRunnerCallPlanStep[];
  readonly planBuiltWithoutScheduling: true;
  readonly noCacheMutation: true;
  readonly transportStillAppOwned: true;
  readonly nextAbsoluteStepStillAppOwned: true;
  readonly runtimeOwned: false;
  readonly audioOwned: false;
};

export type AppStableRhythmLaneRunnerCallPlanProbeArgs = {
  readonly frame: AppStableRhythmLaneStepExecutionFrameProbe;
  readonly selectedExportedDrumConfig: DrumConfigEntry | null;
  readonly planBuiltWithoutScheduling: true;
  readonly noCacheMutation: true;
  readonly transportStillAppOwned: true;
  readonly nextAbsoluteStepStillAppOwned: true;
};

export const buildAppStableRhythmLaneRunnerCallPlanProbe = (
  args: AppStableRhythmLaneRunnerCallPlanProbeArgs,
): AppStableRhythmLaneRunnerCallPlanProbe => {
  const frame = args.frame;
  const p = frame.params;
  const drumStepBranch = resolveAppStableRhythmLaneSchedulerDrumStepBranchProbe({
    drumActive: p.drumActive,
    drumConfigMode: p.drumConfigMode,
    selectedExportedDrumConfig: args.selectedExportedDrumConfig,
    drumPattern: p.drumPattern,
    schedulingStillBoundaryOwned: true,
  }).branch;
  const bassStepBranch = resolveAppStableRhythmLaneSchedulerBassStepBranchProbe({
    bassActive: p.bassActive,
    bassPatternMode: p.bassPatternMode,
    bassClipId: p.bassClipId,
    bassPattern: p.bassPattern,
    schedulingStillBoundaryOwned: true,
  }).branch;

  return {
    probeKind: 'app-stable-rhythm-lane-runner-call-plan-probe',
    step16: frame.stepLocals.step,
    barIndex: frame.stepLocals.barIndex,
    calls: [
      buildAppStableRhythmLaneRunnerCallPlanStepFromContractProbe('metronome', 'always'),
      buildAppStableRhythmLaneRunnerCallPlanStepFromContractProbe('drum', drumStepBranch.kind),
      buildAppStableRhythmLaneRunnerCallPlanStepFromContractProbe('bass', bassStepBranch.kind),
      buildAppStableRhythmLaneRunnerCallPlanStepFromContractProbe('myzel', 'always'),
    ],
    planBuiltWithoutScheduling: true,
    noCacheMutation: true,
    transportStillAppOwned: true,
    nextAbsoluteStepStillAppOwned: true,
    runtimeOwned: false,
    audioOwned: false,
  };
};
