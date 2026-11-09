import type { DrumMachine } from '../../resonance/drumMachine';
import { executeStableRhythmLaneStepPlan, type StableRhythmLaneExecutionResult } from '../audio/stableRhythmLane';
import type { DrumConfigEntry } from '../drumConfigLibraryTypes';
import { buildAppStableRhythmLaneSchedulerInlineActionPort } from './appStableRhythmLaneSchedulerCallsiteSourceProbe';
import { runAppStableRhythmLaneBassStepProbe } from './appStableRhythmLaneBassStepRunnerProbe';
import { runAppStableRhythmLaneDrumStepProbe } from './appStableRhythmLaneDrumStepRunnerProbe';
import { runAppStableRhythmLaneMyzelStepProbe } from './appStableRhythmLaneMyzelStepRunnerProbe';
import { buildAppStableRhythmLaneRunnerCallPlanProbe, type AppStableRhythmLaneRunnerCallPlanProbe } from './appStableRhythmLaneRunnerCallPlanProbe';
import type { AppStableRhythmLaneStepExecutionFrameProbe } from './appStableRhythmLaneStepExecutionFrameProbe';

export type AppStableRhythmLaneStepExecutionRunnerProbeArgs = {
  readonly frame: AppStableRhythmLaneStepExecutionFrameProbe;
  readonly selectedExportedDrumConfig: DrumConfigEntry | null;
  readonly drumMachine: DrumMachine;
  readonly schedulingStillBoundaryOwned: true;
  readonly runtimeOwned: false;
  readonly callPlanObserver?: (callPlan: AppStableRhythmLaneRunnerCallPlanProbe) => void;
  readonly suppressLegacyDrumWhenStableMusicLaneBeatRunning?: boolean;
};

export const executeAppStableRhythmLaneStepExecutionFrameProbe = (
  args: AppStableRhythmLaneStepExecutionRunnerProbeArgs,
): StableRhythmLaneExecutionResult => {
  const frame = args.frame;
  if (args.callPlanObserver) {
    args.callPlanObserver(buildAppStableRhythmLaneRunnerCallPlanProbe({
      frame,
      selectedExportedDrumConfig: args.selectedExportedDrumConfig,
      planBuiltWithoutScheduling: true,
      noCacheMutation: true,
      transportStillAppOwned: true,
      nextAbsoluteStepStillAppOwned: true,
    }));
  }
  const stableRhythmLaneSchedulerActionPort = buildAppStableRhythmLaneSchedulerInlineActionPort({
    scheduleMetronomePulse: (plan) => {
      frame.actionPorts.scheduleStableRhythmMetronomePulse(plan, frame.readPorts.readMetronomeAudioNowSec());
    },
    scheduleDrumStep: () => {
      if (args.suppressLegacyDrumWhenStableMusicLaneBeatRunning === true) return;
      runAppStableRhythmLaneDrumStepProbe({
        frame,
        selectedExportedDrumConfig: args.selectedExportedDrumConfig,
        drumMachine: args.drumMachine,
      });
    },
    scheduleBassStep: () => {
      runAppStableRhythmLaneBassStepProbe({ frame });
    },
    applyMyzelStep: () => {
      runAppStableRhythmLaneMyzelStepProbe({ frame });
    },
  });

  return executeStableRhythmLaneStepPlan(frame.plan, stableRhythmLaneSchedulerActionPort);
};
